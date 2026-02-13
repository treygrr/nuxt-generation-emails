<script setup lang="ts">
import { onMounted } from 'vue'
import { testData } from './test.data'
import { Button, Hr, Html, Text } from '@vue-email/components'

defineOptions({
  name: 'TestNge', // Give it a proper name for Vue DevTools, our only friend in debugging
})

// Load data from URL params on mount
// Because refreshing the page with state is apparently too much to ask without custom logic
onMounted(() => {
  // This magical function reads URL params and shoves them into our reactive store
  // Pray the types match. They probably won't. We'll fix it in production.
  decodeUrlParamsToStore(testData)
})
</script>

<template>
  <Html lang="en">
    <Text>{{ testData.title }}</Text>
    <p>{{ testData.message }}</p>
    <Hr />
    <Button href="https://example.com">
      Click me
    </Button>
  </Html>
</template>
