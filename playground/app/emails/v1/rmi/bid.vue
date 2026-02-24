<script setup lang="ts">
import { computed } from 'vue'
import mjml2html from 'mjml-browser'
import Handlebars from 'handlebars'
import mjmlSource from './bid.mjml?raw'

defineOptions({ name: 'BidNge' })

const props = withDefaults(defineProps<{
  title?: string
  message?: string
}>(), {
  title: 'Welcome!',
  message: 'This is the bid email template.',
})

const compiledTemplate = Handlebars.compile(mjmlSource)

const renderedHtml = computed(() => {
  const mjmlString = compiledTemplate({ ...props })
  const { html } = mjml2html(mjmlString)
  return html
})
</script>

<template>
  <div v-html="renderedHtml" />
</template>
