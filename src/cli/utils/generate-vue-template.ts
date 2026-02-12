export function generateVueTemplate(emailName: string): string {
  // Capitalize the email name and slap 'Nge' on the end because naming is hard
  // and we need to distinguish our generated components from... everything else
  const capitalizedEmailName = emailName.charAt(0).toUpperCase() + emailName.slice(1)
  const componentName = `${capitalizedEmailName}Nge`

  // Return a template string that will become a .vue file
  // We're literally writing code that writes code. This is fine.
  return `<script setup lang="ts">
import { onMounted } from 'vue'
import { ${emailName}Data } from './${emailName}.data'
import { Button, Hr, Html, Text, Tailwind } from '@vue-email/components'

defineOptions({
  name: '${componentName}', // Give it a proper name for Vue DevTools, our only friend in debugging
})

// Load data from URL params on mount
// Because refreshing the page with state is apparently too much to ask without custom logic
onMounted(() => {
  // This magical function reads URL params and shoves them into our reactive store
  // Pray the types match. They probably won't. We'll fix it in production.
  decodeUrlParamsToStore(${emailName}Data)
})
</script>

<template>
  <Tailwind>
    <Html lang="en">
      <Text>{{ ${emailName}Data.title }}</Text>
      <p>{{ ${emailName}Data.message }}</p>
      <Hr />
      <Button href="https://example.com">
        Click me
      </Button>
    </Html>
  </Tailwind>
</template>
`
}
