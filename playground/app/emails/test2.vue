<script setup lang="ts">
defineOptions({ name: 'Test2Nge' })

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

useNgeTemplate('test2', props)
</script>

