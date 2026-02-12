import { defineCommand } from 'citty'
import { consola } from 'consola'
import { loadNuxt } from '@nuxt/kit'

export default defineCommand({
  meta: {
    name: 'regenerate',
    description: 'Regenerate email routes and wrappers',
  },
  async run() {
    consola.start('Regenerating email routes...')

    try {
      const cwd = process.cwd()
      const nuxt = await loadNuxt({
        cwd,
        dev: false,
        overrides: {
          _prepare: true,
        },
      })

      // Trigger a restart which will regenerate routes
      await nuxt.callHook('restart')

      consola.success('Email routes regenerated successfully!')
      consola.info('Restart your dev server to see the changes')

      await nuxt.close()
    }
    catch (error) {
      consola.error('Failed to regenerate routes:', error)
      process.exit(1)
    }
  },
})
