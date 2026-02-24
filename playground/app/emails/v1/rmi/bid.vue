<script setup lang="ts">
defineOptions({ name: 'BidNge' })

const props = withDefaults(defineProps<{
  title?: string
  message?: string
}>(), {
  title: 'Welcome!',
  message: 'This is the bid email template.',
})

useNgeTemplate('v1/rmi/bid', props)
</script>
