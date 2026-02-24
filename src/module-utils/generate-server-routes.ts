import { join } from 'pathe'
import fs from 'node:fs'
import { generateApiRoute } from '../cli/utils/generate-api-route'
import { extractPropsFromSFC } from './extract-props'

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
        const examplePayload = Object.keys(defaults).length > 0
          ? JSON.stringify(defaults, null, 2)
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
