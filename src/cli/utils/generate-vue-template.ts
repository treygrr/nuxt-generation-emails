export function generateVueTemplate(emailName: string, emailRelativePath?: string): string {
  const capitalizedEmailName = emailName.charAt(0).toUpperCase() + emailName.slice(1)
  const componentName = `${capitalizedEmailName}Nge`
  // Template name for useNgeTemplate — relative path from the emails dir, e.g. 'example' or 'v1/test'
  const templatePath = emailRelativePath ?? emailName

  const scriptClose = '<' + '/script>'

  return `<script setup lang="ts">
defineOptions({ name: '${componentName}' })

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
  previewText: 'You have a new message from ${capitalizedEmailName}.',
  heading: 'Welcome!',
  message: 'This is the ${emailName} email template. Edit the .vue props and .mjml template to build your email.',
  ctaLabel: 'Get Started',
  ctaUrl: 'https://example.com',
  showFooter: true,
  sections: () => [
    { heading: 'Section One', body: 'Replace this with your own content.' },
    { heading: 'Section Two', body: 'Add or remove sections via the sidebar.' },
  ],
})

/**
 * useNgeTemplate auto-loads the sibling .mjml file, compiles it with
 * Handlebars, and returns a reactive ComputedRef<string> of rendered HTML.
 * MJML components from components/ are registered automatically.
 */
useNgeTemplate('${templatePath}', props)
${scriptClose}
`
}
