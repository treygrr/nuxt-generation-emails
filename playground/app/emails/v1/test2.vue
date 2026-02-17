<script setup lang="ts">
import { Body, Button, Font, Head, Hr, Html, Text, Tailwind } from '@vue-email/components'

defineOptions({
  name: 'Test2Nge',
})

const props = withDefaults(defineProps<{
  title?: string
  message?: string
}>(), {
  title: 'Welcome!',
  message: 'This is the test2 email template.',
})

const sloansMessage = {
  title: 'some title',
  description: 'some description',
  someDeeper: {
    meaning: 'some meaning',
  },
}
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
        <h1>{{ sloansMessage }}</h1>
        <Hr />
        <Button href="https://example.com">
          This is
        </Button>
      </Body>
    </Html>
  </Tailwind>
</template>
