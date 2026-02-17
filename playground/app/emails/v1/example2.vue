<script setup lang="ts">
import { Body, Button, Font, Head, Hr, Html, Text, Tailwind } from '@vue-email/components'

defineOptions({ name: 'Example2Nge' })

const props = withDefaults(defineProps<{
  title?: string
  message?: string
}>(), {
  title: 'Welcome!',
  message: 'This is the example2 email template.',
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
        <Text>{{ props.title }}</Text>
        <p>{{ props.message }}</p>
        <Hr />
        <Button href="https://example.com">
          Click me
        </Button>
      </Body>
    </Html>
  </Tailwind>
</template>
