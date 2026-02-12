import { join } from 'pathe'
import fs from 'node:fs'
import { generateApiRoute } from '../cli/utils/generate-api-route'

/**
 * Generate server routes for all email templates in a directory
 * @param emailsDir - Path to the emails directory
 * @param rootDir - Root directory of the project
 */
export function generateServerRoutes(emailsDir: string, rootDir: string): void {
  if (!fs.existsSync(emailsDir)) return

  const serverApiDir = join(rootDir, 'server', 'api', 'emails')

  // Ensure the server API directory exists
  if (!fs.existsSync(serverApiDir)) {
    fs.mkdirSync(serverApiDir, { recursive: true })
  }

  // Recursively collect and generate routes for all email templates
  function processEmailDirectory(dirPath: string, routePrefix: string = '') {
    const entries = fs.readdirSync(dirPath)

    for (const entry of entries) {
      const fullPath = join(dirPath, entry)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        processEmailDirectory(fullPath, `${routePrefix}/${entry}`)
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
        const apiTemplate = generateApiRoute(emailName, emailPath)

        fs.writeFileSync(apiFilePath, apiTemplate, 'utf-8')
        console.log(`[nuxt-gen-emails] Generated API route: ${apiFilePath}`)
      }
    }
  }

  processEmailDirectory(emailsDir)
}
