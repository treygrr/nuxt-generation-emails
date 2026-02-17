import { join } from 'pathe'
import fs from 'node:fs'
import { createJiti } from 'jiti'
import { generateApiRoute } from '../cli/utils/generate-api-route'

export interface ServerHandlerInfo {
  route: string
  method: string
  handlerPath: string
}

async function resolveTestDataExampleLiteral(
  dataFilePath: string,
  emailName: string,
  jiti: ReturnType<typeof createJiti>,
): Promise<string | null> {
  if (!fs.existsSync(dataFilePath)) return null

  try {
    const dataModule = await jiti.import<Record<string, unknown>>(dataFilePath)
    const expectedStoreExportName = `${emailName}Data`
    const testData = dataModule?.[expectedStoreExportName] ?? dataModule?.testData
    if (!testData) return null

    return JSON.stringify(testData, null, 2)
  }
  catch {
    return null
  }
}

/**
 * Generate server route handlers for all email templates in a directory.
 * Handlers are written to the build directory and returned for registration
 * via addServerHandler(), keeping the user's source tree clean.
 *
 * @param emailsDir - Path to the emails directory
 * @param buildDir  - Nuxt build directory (.nuxt)
 * @param rootDir   - Root directory of the project (used for jiti resolution)
 * @returns Array of handler info objects for registration with addServerHandler()
 */
export async function generateServerRoutes(
  emailsDir: string,
  buildDir: string,
  rootDir: string,
): Promise<ServerHandlerInfo[]> {
  if (!fs.existsSync(emailsDir)) return []

  const handlersDir = join(buildDir, 'email-handlers')
  const handlers: ServerHandlerInfo[] = []

  const jiti = createJiti(rootDir, {
    interopDefault: true,
    moduleCache: false,
    fsCache: false,
  })

  // Ensure the handlers output directory exists
  if (!fs.existsSync(handlersDir)) {
    fs.mkdirSync(handlersDir, { recursive: true })
  }

  // Recursively collect and generate handlers for all email templates
  async function processEmailDirectory(dirPath: string, routePrefix: string = '') {
    const entries = fs.readdirSync(dirPath)

    for (const entry of entries) {
      const fullPath = join(dirPath, entry)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        await processEmailDirectory(fullPath, `${routePrefix}/${entry}`)
      }
      else if (entry.endsWith('.vue')) {
        const emailName = entry.replace('.vue', '')
        const emailPath = `${routePrefix}/${emailName}`.replace(/^\//, '')

        const handlerDir = routePrefix
          ? join(handlersDir, routePrefix.replace(/^\//, ''))
          : handlersDir

        if (!fs.existsSync(handlerDir)) {
          fs.mkdirSync(handlerDir, { recursive: true })
        }

        const handlerFileName = `${emailName}.ts`
        const handlerFilePath = join(handlerDir, handlerFileName)
        const dataFilePath = join(dirPath, `${emailName}.data.ts`)
        const testDataExampleLiteral = await resolveTestDataExampleLiteral(dataFilePath, emailName, jiti) ?? '{}'
        const handlerContent = generateApiRoute(emailName, emailPath, testDataExampleLiteral)

        fs.writeFileSync(handlerFilePath, handlerContent, 'utf-8')
        console.log(`[nuxt-gen-emails] Generated API handler: ${handlerFilePath}`)

        handlers.push({
          route: `/api/emails/${emailPath}`,
          method: 'post',
          handlerPath: handlerFilePath,
        })
      }
    }
  }

  await processEmailDirectory(emailsDir)
  return handlers
}
