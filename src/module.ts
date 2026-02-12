import { defineNuxtModule, addPlugin, createResolver, addServerImports, addImports } from '@nuxt/kit'
import vue from '@vitejs/plugin-vue'
import { join } from 'pathe'

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
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    // Do not add the extension since the `.ts` will be transpiled to `.mjs` after `npm run prepack`
    addPlugin(resolver.resolve('./runtime/plugin'))
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

    const rollupConfig = nuxt.options.nitro?.rollupConfig ?? {}
    const existingPlugins = rollupConfig.plugins ?? []
    const plugins = Array.isArray(existingPlugins) ? existingPlugins : [existingPlugins]

    rollupConfig.plugins = [...plugins, vue()]
    nuxt.options.nitro = { ...nuxt.options.nitro, rollupConfig }
  },
})
