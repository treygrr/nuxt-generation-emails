import { defineNuxtModule, addPlugin, createResolver } from '@nuxt/kit'
import vue from '@vitejs/plugin-vue'

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
  setup(_options, nuxt) {
    const resolver = createResolver(import.meta.url)

    // Do not add the extension since the `.ts` will be transpiled to `.mjs` after `npm run prepack`
    addPlugin(resolver.resolve('./runtime/plugin'))

    const rollupConfig = nuxt.options.nitro?.rollupConfig ?? {}
    const existingPlugins = rollupConfig.plugins ?? []
    const plugins = Array.isArray(existingPlugins) ? existingPlugins : [existingPlugins]

    rollupConfig.plugins = [...plugins, vue()]
    nuxt.options.nitro = { ...nuxt.options.nitro, rollupConfig }
  },
})
