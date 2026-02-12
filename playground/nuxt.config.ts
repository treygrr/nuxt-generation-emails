export default defineNuxtConfig({
  modules: ['nuxt-generation-emails'],
  devtools: { enabled: true },
  compatibilityDate: 'latest',
  nuxtGenerationEmails: {
    emailDir: 'emails',
  },
})
