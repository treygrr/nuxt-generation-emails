export function generateVueTemplate(emailName: string): string {
  const capitalizedEmailName = emailName.charAt(0).toUpperCase() + emailName.slice(1)
  const componentName = `${capitalizedEmailName}Nge`

  return `<script setup lang="ts">
import { Body, Button, Font, Head, Hr, Html, Text, Tailwind } from '@vue-email/components'

defineOptions({ name: '${componentName}' })

const props = withDefaults(defineProps<{
  title: string
  message: string
}>(), {
  title: 'Welcome!',
  message: 'This is the ${emailName} email template.',
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
`
}
        <Text>{{ ${emailName}Data.title }}</Text>
        <p>{{ ${emailName}Data.message }}</p>
        <Hr />
        <Button href="https://example.com">
          Click me
        </Button>
      </Body>
    </Html>
  </Tailwind>
</template>
`
}
