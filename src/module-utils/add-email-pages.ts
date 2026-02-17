import { join } from 'pathe'
import fs from 'node:fs'
import type { NuxtPage } from '@nuxt/schema'
import { generateWrapperComponent } from './generate-wrapper-component'
import { extractPropsFromSFC } from './extract-props'

export interface AddEmailPagesOptions {
  emailsDir: string
  buildDir: string
  emailTemplateComponentPath: string
}

/**
 * Recursively add email template pages to the pages array.
 *
 * For each .vue email template, a wrapper component is generated that:
 * - Extracts prop definitions and defaults directly from the SFC
 * - Creates a reactive props object for the preview UI
 * - Handles URL param hydration automatically (no user boilerplate)
 * - Passes props to both the email component and the layout controls
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

      const wrapperPath = join(options.buildDir, 'email-wrappers', `${routePrefix}/${name}.vue`.replace(/^\//, ''))
      const wrapperDir = join(options.buildDir, 'email-wrappers', routePrefix.replace(/^\//, ''))
      if (!fs.existsSync(wrapperDir)) {
        fs.mkdirSync(wrapperDir, { recursive: true })
      }

      // Extract prop definitions directly from the SFC — no .data.ts needed
      const extractedProps = extractPropsFromSFC(fullPath)

      const wrapperContent = generateWrapperComponent(
        options.emailTemplateComponentPath,
        fullPath,
        extractedProps,
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
