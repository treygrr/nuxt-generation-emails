export function generateWrapperComponent(
  emailsLayoutPath: string,
  emailComponentPath: string,
  dataStorePath?: string,
): string {
  // Check if we have a data store because apparently we need to know this NOW
  // Double bang (!!) to convert to boolean. JavaScript doesn't have a .exists() method. We suffer.
  const hasDataStore = !!dataStorePath

  // Generate a string template that is a Vue SFC. Yes, we're generating code that generates UI.
  // Welcome to meta-programming, where your brain hurts and the stack traces are meaningless.
  return `<script setup lang="ts">
import { definePageMeta } from '#imports'
import EmailsLayout from '${emailsLayoutPath}'
import EmailComponent from '${emailComponentPath}'${hasDataStore
  ? `
import * as emailStore from '${dataStorePath}'` // Conditionally import the store if it exists
  : ''}  // Otherwise just... don't. Simple. Elegant. Chaos.

definePageMeta({
  layout: false,  // No layout because we ARE the layout. Mind = blown.
})
</script>

<template>
  <EmailsLayout${hasDataStore ? ' :email-store="emailStore"' : ''}>  <!-- Pass store as prop if we have it -->
    <EmailComponent />  <!-- The actual email content sits here, blissfully unaware of the complexity above -->
  </EmailsLayout>
</template>
`
}
