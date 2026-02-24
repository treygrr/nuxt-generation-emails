<script setup lang="ts">
import { computed } from 'vue'
import mjml2html from 'mjml-browser'
import Handlebars from 'handlebars'
import mjmlSource from './test2.mjml?raw'

defineOptions({ name: 'Test2Nge' })

/**
 * Define interfaces for complex prop types here.
 * Every Handlebars variable in the .mjml template must map to a prop
 * so the server-side API route can pass templateData straight through.
 */
interface ContentSection {
  heading: string
  body: string
}

const props = withDefaults(defineProps<{
  previewText?: string
  heading?: string
  message?: string
  ctaLabel?: string
  ctaUrl?: string
  showFooter?: boolean
  sections?: ContentSection[]
}>(), {
  previewText: 'You have a new message from Test2.',
  heading: 'Welcome!',
  message: 'This is the test2 email template. Edit the .vue props and .mjml template to build your email.',
  ctaLabel: 'Get Started',
  ctaUrl: 'https://example.com',
  showFooter: true,
  sections: () => [
    { heading: 'Section One', body: 'Replace this with your own content.' },
    { heading: 'Section Two', body: 'Add or remove sections via the sidebar.' },
  ],
})

const compiledTemplate = Handlebars.compile(mjmlSource)

const renderedHtml = computed(() => {
  try {
    const mjmlString = compiledTemplate({ ...props })
    const result = mjml2html(mjmlString)
    return result.html
  }
  catch (e: unknown) {
    console.error('[test2.vue] Error rendering MJML:', e)
    return `<pre style="color:red;">${
      e instanceof Error ? e.message : String(e)
    }\n${
      e instanceof Error ? e.stack : ''
    }</pre>`
  }
})
</script>

<template>
  <div v-html="renderedHtml" />
</template>
