import { defineNuxtModule, createResolver, addServerImports, addServerHandler, addImports, addTypeTemplate, extendPages } from '@nuxt/kit'
import fs from 'node:fs'
import vue from '@vitejs/plugin-vue'
import { join, relative } from 'pathe'
import { consola } from 'consola'
import { addEmailPages } from './module-utils/add-email-pages'
import { generateServerRoutes } from './module-utils/generate-server-routes'

/** Payload passed to the `nuxt-gen-emails:send` Nitro runtime hook. */
export interface NuxtGenEmailsSendPayload {
  /** The rendered HTML string of the email template. */
  html: string
  /** Arbitrary data forwarded from the request body (e.g. `to`, `subject`). */
  data: Record<string, unknown>
}

// Module options TypeScript interface definition
export interface ModuleOptions {
  /** Directory containing email templates; resolved from srcDir when relative. */
  emailDir?: string
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-generation-emails',
    configKey: 'nuxtGenerationEmails',
    compatibility: {
      // Semver version of supported nuxt versions
      nuxt: '>=4.0.0',
    },
  },
  defaults: {
    emailDir: 'emails',
  },
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    // Inject Nitro runtime hook type augmentation into .nuxt/types/
    // Pass both nuxt and nitro contexts so the types are visible in both client and server tsconfigs
    addTypeTemplate({
      filename: 'types/nuxt-gen-emails-nitro.d.ts',
      getContents: () => `
export interface NuxtGenEmailsSendPayload {
  html: string
  data: Record<string, unknown>
}

declare module 'nitropack' {
  interface NitroRuntimeHooks {
    'nuxt-gen-emails:send': (payload: NuxtGenEmailsSendPayload) => void | Promise<void>
  }
}
declare module 'nitropack/types' {
  interface NitroRuntimeHooks {
    'nuxt-gen-emails:send': (payload: NuxtGenEmailsSendPayload) => void | Promise<void>
  }
}
`,
    }, { nuxt: true, nitro: true })

    // Register the emails directory in the app directory
    const configuredEmailDir = options.emailDir ?? 'emails'

    const emailsDir = join(nuxt.options.srcDir, configuredEmailDir)
    // Expose emails directory via runtime config (functions cannot be serialized)
    nuxt.options.runtimeConfig.nuxtGenEmails = {
      emailsDir,
    }

    // Add client auto-imports for URL params utilities
    addImports([
      {
        name: 'encodeStoreToUrlParams',
        from: resolver.resolve('./runtime/utils/url-params'),
      },
      {
        name: 'generateShareableUrl',
        from: resolver.resolve('./runtime/utils/url-params'),
      },
    ])

    // Add server-side imports for URL params utilities
    addServerImports([
      {
        name: 'encodeStoreToUrlParams',
        from: resolver.resolve('./runtime/utils/url-params'),
      },
    ])

    // Register email preview pages under /__emails/
    extendPages((pages) => {
      if (!fs.existsSync(emailsDir)) {
        return
      }

      addEmailPages(emailsDir, pages, {
        emailsDir,
        buildDir: nuxt.options.buildDir,
        emailTemplateComponentPath: resolver.resolve('./runtime/pages/__emails.vue'),
      })
    })

    // Generate server route handlers into the build directory and register them programmatically.
    // Props and defaults are extracted from each SFC's defineProps + withDefaults.
    const handlers = generateServerRoutes(emailsDir, nuxt.options.buildDir)

    for (const handler of handlers) {
      addServerHandler({
        route: handler.route,
        method: handler.method,
        handler: handler.handlerPath,
      })
    }

    const rollupConfig = nuxt.options.nitro?.rollupConfig ?? {}
    const existingPlugins = rollupConfig.plugins ?? []
    const plugins = Array.isArray(existingPlugins) ? existingPlugins : [existingPlugins]

    rollupConfig.plugins = [...plugins, vue()]
    nuxt.options.nitro = { ...nuxt.options.nitro, rollupConfig }

    // In dev mode, watch the emails directory for added/removed .vue files.
    if (nuxt.options.dev && fs.existsSync(emailsDir)) {
      const relDir = relative(nuxt.options.rootDir, emailsDir)
      consola.info(`[nuxt-gen-emails] Watching for new templates in ${relDir}/`)

      // Add emails directory to Nuxt's native watch list
      nuxt.options.watch.push(emailsDir + '/**/*.vue')

      nuxt.hook('builder:watch', (event, relativePath) => {
        const absolutePath = join(nuxt.options.rootDir, relativePath)
        const rel = relative(emailsDir, absolutePath)

        if (event === 'add') {
          consola.success(`[nuxt-gen-emails] New template detected: ${rel}`)
          consola.info('[nuxt-gen-emails] Restarting to register new routes...')
          nuxt.callHook('restart')
        }
        else if (event === 'unlink') {
          consola.warn(`[nuxt-gen-emails] Template removed: ${rel}`)
          consola.info('[nuxt-gen-emails] Restarting to update routes...')
          nuxt.callHook('restart')
        }
      })
    }
  },
})
