import { join } from 'pathe'
import fs from 'node:fs'
import { createJiti } from 'jiti'
import { generateApiRoute } from '../cli/utils/generate-api-route'

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
 * Generate server routes for all email templates in a directory
 * @param emailsDir - Path to the emails directory
 * @param rootDir - Root directory of the project
 */
export async function generateServerRoutes(emailsDir: string, rootDir: string): Promise<void> {
  if (!fs.existsSync(emailsDir)) return

  const serverApiDir = join(rootDir, 'server', 'api', 'emails')
  const jiti = createJiti(rootDir, {
    interopDefault: true,
    moduleCache: false,
    fsCache: false,
  })

  // Ensure the server API directory exists
  if (!fs.existsSync(serverApiDir)) {
    fs.mkdirSync(serverApiDir, { recursive: true })
  }

  // Recursively collect and generate routes for all email templates
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

        // Create the API route file
        const apiRouteDir = routePrefix
          ? join(serverApiDir, routePrefix.replace(/^\//, ''))
          : serverApiDir

        if (!fs.existsSync(apiRouteDir)) {
          fs.mkdirSync(apiRouteDir, { recursive: true })
        }

        const apiFileName = `${emailName}.post.ts`
        const apiFilePath = join(apiRouteDir, apiFileName)
        const dataFilePath = join(dirPath, `${emailName}.data.ts`)
        const testDataExampleLiteral = await resolveTestDataExampleLiteral(dataFilePath, emailName, jiti) ?? '{}'
        const apiTemplate = generateApiRoute(emailName, emailPath, testDataExampleLiteral)

        fs.writeFileSync(apiFilePath, apiTemplate, 'utf-8')
        console.log(`[nuxt-gen-emails] Generated API route: ${apiFilePath}`)
      }
    }
  }

  await processEmailDirectory(emailsDir)
}
