<script setup lang="ts">
const props = withDefaults(defineProps<{
  previewText?: string
  heading?: string
  message?: string
  ctaText?: string
  ctaUrl?: string
}>(), {
  previewText: 'You have a new notification.',
  heading: 'Action required',
  message: 'This is a mock transactional email used for tests.',
  ctaText: 'View details',
  ctaUrl: 'https://example.com/details',
})

useNgeTemplate('mock-notification', props)
</script>
