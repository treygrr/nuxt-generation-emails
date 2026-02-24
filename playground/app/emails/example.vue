<script setup lang="ts">
import { computed } from 'vue'
import mjml2html from 'mjml-browser'
import Handlebars from 'handlebars'
import mjmlSource from './example.mjml?raw'

defineOptions({ name: 'ExampleNge' })

registerMjmlComponents()

interface ContentSection {
  heading: string
  body: string
}

const props = withDefaults(defineProps<{
  previewText?: string
  brandName?: string
  heading?: string
  message?: string
  ctaLabel?: string
  ctaUrl?: string
  unsubscribeUrl?: string
  sections?: ContentSection[]
}>(), {
  previewText: 'You have a new message.',
  brandName: 'My Brand',
  heading: 'Welcome!',
  message: 'This example email uses reusable components (header, divider, footer) from the components/ directory. Edit the props and templates to make it your own.',
  ctaLabel: 'Get Started',
  ctaUrl: 'https://example.com',
  unsubscribeUrl: 'https://example.com/unsubscribe',
  sections: () => [
    { heading: 'Header', body: 'The header above comes from components/header.mjml — use {{> header}} to include it.' },
    { heading: 'Divider', body: 'The divider between sections comes from components/divider.mjml — use {{> divider}} to include it.' },
    { heading: 'Footer', body: 'The footer below comes from components/footer.mjml — use {{> footer}} to include it.' },
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
    console.error('[example.vue] Error rendering MJML:', e)
    return `<pre style="color:red;">${e instanceof Error ? e.message : String(e)}\n${e instanceof Error ? e.stack : ''}</pre>`
  }
})
</script>

<template>
  <div v-html="renderedHtml" />
</template>
