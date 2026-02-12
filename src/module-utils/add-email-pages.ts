import { join } from 'pathe'
import fs from 'node:fs'
import type { NuxtPage } from '@nuxt/schema'
import { generateWrapperComponent } from './generate-wrapper-component'

export interface AddEmailPagesOptions {
  emailsDir: string
  buildDir: string
  emailTemplateComponentPath: string
}

/**
 * Recursively add email template pages to the pages array
 * @param dirPath - Path to start processing from
 * @param pages - Array to push generated pages to
 * @param options - Configuration options
 * @param routePrefix - Route prefix (default: '')
 */
export function addEmailPages(
  dirPath: string,
  pages: NuxtPage[],
  options: AddEmailPagesOptions,
  routePrefix: string = '',
): void {
  const entries = fs.readdirSync(dirPath)

  for (const entry of entries) {
    const fullPath = join(dirPath, entry)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      addEmailPages(fullPath, pages, options, `${routePrefix}/${entry}`)
    }
    else if (entry.endsWith('.vue')) {
      const name = entry.replace('.vue', '')
      const routePath = `/__emails${routePrefix}/${name}`

      // Create a wrapper page that includes both the toolbar and the email component
      const wrapperPath = join(options.buildDir, 'email-wrappers', `${routePrefix}/${name}.vue`.replace(/^\//, ''))

      // Ensure directory exists
      const wrapperDir = join(options.buildDir, 'email-wrappers', routePrefix.replace(/^\//, ''))
      if (!fs.existsSync(wrapperDir)) {
        fs.mkdirSync(wrapperDir, { recursive: true })
      }

      // Check if data store file exists
      const dataFilePath = fullPath.replace('.vue', '.data.ts')
      const hasDataStore = fs.existsSync(dataFilePath)

      // Generate wrapper component
      const wrapperContent = generateWrapperComponent(
        options.emailTemplateComponentPath,
        fullPath,
        hasDataStore ? dataFilePath : undefined,
      )

      fs.writeFileSync(wrapperPath, wrapperContent, 'utf-8')

      const pageName = `email${routePrefix.replace(/\//g, '-')}-${name}`.replace(/^-+/, '')
      pages.push({
        name: pageName,
        path: routePath,
        file: wrapperPath,
      })
    }
  }
}
