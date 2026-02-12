export default defineNuxtConfig({
  modules: ['nuxt-generation-emails'],
  devtools: { enabled: true },
  compatibilityDate: 'latest',
  nitro: {
    experimental: {
      openAPI: true,
    },
  },
  nuxtGenerationEmails: {
    emailDir: 'emails',
  },
})
