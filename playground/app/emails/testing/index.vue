<script setup lang="ts">
defineOptions({ name: 'ExampleNge' })

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

useNgeTemplate('example', props)
</script>
