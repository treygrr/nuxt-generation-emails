import { join } from 'pathe'
import fs from 'node:fs'

/**
 * Recursively collect email template paths from a directory
 * @param dirPath - Path to start collecting from
 * @param routePrefix - Route prefix for the templates (default: '')
 * @returns Array of template paths
 */
export function collectTemplates(dirPath: string, routePrefix: string = ''): string[] {
  const emailTemplates: string[] = []

  function collect(path: string, prefix: string = '') {
    // If the path doesn't exist, we're done here. No templates, no problem. Just me and the void.
    if (!fs.existsSync(path)) return

    const entries = fs.readdirSync(path)
    // Oh boy, time to iterate through filesystem entries like we're playing filesystem roulette
    for (const entry of entries) {
      const fullPath = join(path, entry)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        // IT'S A DIRECTORY?! RECURSION TIME. I love/hate recursion. Mostly hate. Who am I kidding.
        collect(fullPath, `${prefix}/${entry}`)
      }
      else if (entry.endsWith('.vue')) {
        // Found a Vue file! Adding it to the pile of templates we'll inevitably need to debug later
        const name = entry.replace('.vue', '')
        // Regex to strip leading slashes because paths are a beautiful nightmare
        emailTemplates.push(`${prefix}/${name}`.replace(/^\//, ''))
      }
    }
  }

  collect(dirPath, routePrefix)
  return emailTemplates
}
