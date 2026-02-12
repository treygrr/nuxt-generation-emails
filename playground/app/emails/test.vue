<script setup lang="ts">
import { onMounted } from 'vue'
import { testData } from './test.data'

defineOptions({
  name: 'TestNge',  // Give it a proper name for Vue DevTools, our only friend in debugging
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
  <div>
    <!-- Default template because a blank page is depressing -->
    <h1>{{ testData.title }}</h1>
    <p>{{ testData.message }}</p>
  </div>
</template>
