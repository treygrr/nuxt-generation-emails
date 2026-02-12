import { defineCommand } from 'citty'
import { join, relative } from 'pathe'
import { existsSync, mkdirSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { consola } from 'consola'
import { loadNuxtConfig } from '@nuxt/kit'
import { generateDataTemplate } from './utils/generate-data-template'
import { generateVueTemplate } from './utils/generate-vue-template'

interface ParsedTemplateName {
  emailName: string
  subDir: string
}

interface TemplateFiles {
  emailPath: string
  vueFile: string
  dataFile: string
  apiFile: string
}

async function findEmailsDir(): Promise<string> {
  const cwd = process.cwd()

  try {
    const config = await loadNuxtConfig({ cwd })
    const srcDir = config.srcDir || cwd
    return join(srcDir, 'emails')
  }
  catch {
    // Fallback if nuxt config can't be loaded
    if (existsSync(join(cwd, 'app'))) {
      return join(cwd, 'app', 'emails')
    }

    if (existsSync(join(cwd, 'src'))) {
      return join(cwd, 'src', 'emails')
    }

    return join(cwd, 'emails')
  }
}

function getAllDirectories(dirPath: string, basePath: string = dirPath): string[] {
  const dirs: string[] = []

  // Path doesn't exist? Cool. Return empty array. Problem solved. I'm a genius.
  if (!existsSync(dirPath)) {
    return dirs
  }

  const entries = readdirSync(dirPath)
  // Loop through every entry and find the directories
  for (const entry of entries) {
    const fullPath = join(dirPath, entry)
    // Check if it's a directory by asking the filesystem gods
    if (statSync(fullPath).isDirectory()) {
      const relativePath = relative(basePath, fullPath)
      dirs.push(relativePath)
      // RECURSION AGAIN. Because apparently I enjoy watching the call stack grow
      // This will traverse the entire directory tree. Hope there's no circular symlinks! (There probably are)
      dirs.push(...getAllDirectories(fullPath, basePath))
    }
  }

  return dirs
}

function parseTemplateName(name: string): ParsedTemplateName {
  // Strip './' prefix and '.vue' suffix because users can't be trusted to follow instructions
  const namePath = name.replace(/^\.\//, '').replace(/\.vue$/, '')
  // Split on slashes to handle nested paths like 'v1/test-email'
  const parts = namePath.split('/')
  // Pop the last element (the actual email name). The ! is us telling TypeScript "trust me bro"
  const emailName = parts.pop()!
  // Everything else is the subdirectory path. Or nothing. Schrodinger's path.
  const subDir = parts.length > 0 ? join(...parts) : ''

  return { emailName, subDir }
}

async function promptForDirectory(emailsDir: string, initialSubDir: string, argsDir: string): Promise<string> {
  if (initialSubDir || argsDir) {
    return initialSubDir
  }

  const existingDirs = getAllDirectories(emailsDir)
  if (existingDirs.length === 0) {
    return ''
  }

  const useExisting = await consola.prompt('Would you like to select an existing directory?', {
    type: 'confirm',
    initial: false,
  })

  if (!useExisting) {
    return ''
  }

  const selectedDir = await consola.prompt('Select a directory:', {
    type: 'select',
    options: [
      { label: 'emails/ (root)', value: '' },
      ...existingDirs.map(dir => ({ label: `emails/${dir}/`, value: dir })),
    ],
  })

  return selectedDir as string
}

function ensureDirectoryExists(dirPath: string, description: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true })
    consola.success(`Created ${description}: ${dirPath}`)
  }
}

function checkFileExists(filePath: string): void {
  if (existsSync(filePath)) {
    consola.error(`Email template already exists: ${filePath}`)
    process.exit(1)
  }
}

function createEmailFiles(
  targetDir: string,
  emailName: string,
  emailPath: string,
): TemplateFiles {
  const vueFile = join(targetDir, `${emailName}.vue`)
  const dataFile = join(targetDir, `${emailName}.data.ts`)

  checkFileExists(vueFile)

  const dataTemplate = generateDataTemplate(emailName)
  const vueTemplate = generateVueTemplate(emailName)

  writeFileSync(dataFile, dataTemplate, 'utf-8')
  consola.success(`Created data store: ${dataFile}`)

  writeFileSync(vueFile, vueTemplate, 'utf-8')
  consola.success(`Created email template: ${vueFile}`)

  return {
    emailPath,
    vueFile,
    dataFile,
    apiFile: '',
  }
}

// function createApiRoute(
//   emailName: string,
//   emailPath: string,
//   subDir: string,
// ): string {
//   const cwd = process.cwd()
//   const serverApiDir = join(cwd, 'server', 'api', 'emails')
//   const apiRouteDir = subDir ? join(serverApiDir, subDir) : serverApiDir

//   ensureDirectoryExists(apiRouteDir, 'API directory')

//   const apiFileName = `${emailName}.post.ts`
//   const apiFilePath = join(apiRouteDir, apiFileName)
//   const apiTemplate = generateApiRoute(emailName, emailPath)

//   writeFileSync(apiFilePath, apiTemplate, 'utf-8')
//   consola.success(`Created API route: ${apiFilePath}`)

//   return apiFilePath
// }

export default defineCommand({
  meta: {
    name: 'add',
    description: 'Scaffold a new email template',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Name of the email template to create',
      required: true,
    },
    dir: {
      type: 'string',
      description: 'Directory to create the email in (relative to emails folder)',
      default: '',
    },
  },
  async run({ args }) {
    const emailsDir = await findEmailsDir()
    const { emailName, subDir: initialSubDir } = parseTemplateName(args.name)
    const subDir = await promptForDirectory(emailsDir, initialSubDir, args.dir)

    const targetDir = join(emailsDir, args.dir, subDir)
    ensureDirectoryExists(targetDir, 'emails directory')

    const emailPath = join(subDir, emailName).replace(/\\/g, '/')

    createEmailFiles(targetDir, emailName, emailPath)
    // createApiRoute(emailName, emailPath, subDir)
  },
})
