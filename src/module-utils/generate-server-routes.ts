import { join } from 'pathe'
import fs from 'node:fs'
import { generateApiRoute } from '../cli/utils/generate-api-route'
import { extractPropsFromSFC } from './extract-props'

/**
 * Recursively sanitise string values so that the JSON blob we embed inside
 * the generated handler's `defineRouteMeta()` survives esbuild + Nitro's
 * static `astToObject` extraction intact.
 *
 * Problem: `JSON.stringify` encodes inner double-quotes as `\"`.  When
 * esbuild re-parses the generated .ts file it may convert those strings to
 * template literals (backtick-quoted) to avoid the escapes.  Nitro's
 * `astToObject` only handles `Literal` AST nodes — *not* `TemplateLiteral`
 * — so any value that esbuild promoted to a template literal silently
 * becomes `undefined` in the OpenAPI spec.
 *
 * Fix: replace every `"` that lives *inside* a string value with the
 * Unicode escape `\u0022`.  `JSON.stringify` will emit it verbatim
 * (`\u0022` is valid JSON), esbuild will leave the string as a regular
 * `Literal`, and Nitro's parser will read it correctly.
 */
function sanitizeForOpenApi(value: unknown): unknown {
  if (typeof value === 'string') {
    // Replace embedded double-quotes with their unicode escape so
    // JSON.stringify won't produce \" which triggers esbuild template-literal
    // promotion.  Also strip any stray \' sequences.
    return value.replace(/"/g, '\u005Cu0022').replace(/\\'/g, '\'')
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeForOpenApi)
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeForOpenApi(v)
    }
    return out
  }
  return value
}

export interface ServerHandlerInfo {
  route: string
  method: 'post' | 'get' | 'put' | 'delete' | 'patch'
  handlerPath: string
}

/**
 * Generate server route handlers for all email templates in a directory.
 * Handlers are written to the build directory and returned for registration
 * via addServerHandler(), keeping the user's source tree clean.
 *
 * Props and defaults are extracted directly from each .vue SFC's defineProps +
 * withDefaults — no separate .data.ts file needed.
 *
 * @param emailsDir - Path to the emails directory
 * @param buildDir  - Nuxt build directory (.nuxt)
 * @returns Array of handler info objects for registration with addServerHandler()
 */
export function generateServerRoutes(
  emailsDir: string,
  buildDir: string,
): ServerHandlerInfo[] {
  if (!fs.existsSync(emailsDir)) return []

  const handlersDir = join(buildDir, 'email-handlers')
  const handlers: ServerHandlerInfo[] = []

  if (!fs.existsSync(handlersDir)) {
    fs.mkdirSync(handlersDir, { recursive: true })
  }

  function processEmailDirectory(dirPath: string, routePrefix: string = '') {
    const entries = fs.readdirSync(dirPath)

    for (const entry of entries) {
      const fullPath = join(dirPath, entry)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        // Skip the components directory (reserved for reusable MJML partials)
        if (entry === 'components') {
          continue
        }
        processEmailDirectory(fullPath, `${routePrefix}/${entry}`)
      }
      else if (entry.endsWith('.vue')) {
        const emailName = entry.replace('.vue', '')
        const emailPath = `${routePrefix}/${emailName}`.replace(/^\//, '')

        // Verify co-located .mjml file exists
        const mjmlPath = join(dirPath, `${emailName}.mjml`)
        if (!fs.existsSync(mjmlPath)) {
          console.warn(`[nuxt-generation-emails] Missing co-located MJML file for ${emailName}.vue — skipping API route. Expected: ${mjmlPath}`)
          continue
        }

        const handlerDir = routePrefix
          ? join(handlersDir, routePrefix.replace(/^\//, ''))
          : handlersDir

        if (!fs.existsSync(handlerDir)) {
          fs.mkdirSync(handlerDir, { recursive: true })
        }

        // Extract prop defaults from the SFC for the OpenAPI example payload
        const { defaults } = extractPropsFromSFC(fullPath)
        const sanitized = sanitizeForOpenApi(defaults)
        const examplePayload = Object.keys(sanitized).length > 0
          ? JSON.stringify(sanitized, null, 2)
          : '{}'

        const handlerFileName = `${emailName}.ts`
        const handlerFilePath = join(handlerDir, handlerFileName)
        const handlerContent = generateApiRoute(emailName, emailPath, examplePayload)

        fs.writeFileSync(handlerFilePath, handlerContent, 'utf-8')
        console.log(`[nuxt-generation-emails] Generated API handler: ${handlerFilePath}`)

        handlers.push({
          route: `/api/emails/${emailPath}`,
          method: 'post',
          handlerPath: handlerFilePath,
        })
      }
    }
  }

  processEmailDirectory(emailsDir)
  return handlers
}
