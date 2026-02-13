import { defineNuxtModule, createResolver, addServerImports, addImports, extendPages } from '@nuxt/kit'
import fs from 'node:fs'
import vue from '@vitejs/plugin-vue'
import { join } from 'pathe'
import { addEmailPages } from './module-utils/add-email-pages'
import { generateServerRoutes } from './module-utils/generate-server-routes'

// Module options TypeScript interface definition
export interface ModuleOptions {
  /** Directory containing email templates; resolved from srcDir when relative. */
  emailDir?: string

  sendGenEmails?: (html: string, data: Record<string, unknown>) => Promise<void> | void
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

    // Register the emails directory in the app directory
    const configuredEmailDir = options.emailDir ?? 'emails'

    const emailsDir = join(nuxt.options.srcDir, configuredEmailDir)
    // Expose emails directory and security config via runtime config
    nuxt.options.runtimeConfig.nuxtGenEmails = {
      emailsDir,
      sendGenEmails: options.sendGenEmails,
    }

    // Add client auto-imports for URL params utilities
    addImports([
      {
        name: 'encodeStoreToUrlParams',
        from: resolver.resolve('./runtime/utils/url-params'),
      },
      {
        name: 'decodeUrlParamsToStore',
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
      {
        name: 'getSendGenEmailsHandler',
        from: resolver.resolve('./runtime/server/utils/send-gen-emails'),
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

    // Generate initial server routes on module setup
    await generateServerRoutes(emailsDir, nuxt.options.rootDir)

    const rollupConfig = nuxt.options.nitro?.rollupConfig ?? {}
    const existingPlugins = rollupConfig.plugins ?? []
    const plugins = Array.isArray(existingPlugins) ? existingPlugins : [existingPlugins]

    rollupConfig.plugins = [...plugins, vue()]
    nuxt.options.nitro = { ...nuxt.options.nitro, rollupConfig }
  },
})
