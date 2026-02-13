<script setup lang="ts">
import { onMounted } from 'vue'
import { test2Data } from './test2.data'
import { Body, Button, Font, Head, Hr, Html, Text, Tailwind } from '@vue-email/components'

defineOptions({
  name: 'Test2Nge', // Give it a proper name for Vue DevTools, our only friend in debugging
})

// Load data from URL params on mount
// Because refreshing the page with state is apparently too much to ask without custom logic
onMounted(() => {
  // This magical function reads URL params and shoves them into our reactive store
  // Pray the types match. They probably won't. We'll fix it in production.
  decodeUrlParamsToStore(test2Data)
})
</script>

<template>
  <Tailwind>
    <Html lang="en">
      <Head />
      <Font
        font-family="DM Sans"
        :fallback-font-family="['Arial', 'Helvetica', 'sans-serif']"
        :web-font="{ url: 'https://fonts.gstatic.com/s/dmsans/v15/rP2Hp2ywxg089UriCZOIHTWEBlw.woff2', format: 'woff2' }"
      />
      <Body style="font-family: 'DM Sans', Arial, Helvetica, sans-serif;">
        <Text>{{ test2Data.title }}</Text>
        <p>{{ test2Data.message }}</p>
        <h1>{{ test2Data.sloansMessage }}</h1>
        <Hr />
        <Button href="https://example.com">
          This is
        </Button>
      </Body>
    </Html>
  </Tailwind>
</template>
