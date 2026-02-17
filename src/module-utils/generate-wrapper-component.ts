import type { ExtractedProps } from './extract-props'

export function generateWrapperComponent(
  emailsLayoutPath: string,
  emailComponentPath: string,
  extractedProps: ExtractedProps,
): string {
  const hasProps = extractedProps.props.length > 0

  // Build the defaults object literal for the reactive props state
  const defaultsLiteral = JSON.stringify(extractedProps.defaults, null, 2)

  // Build the prop definitions array literal for the preview UI
  const propDefsLiteral = JSON.stringify(
    extractedProps.props.map(p => ({ name: p.name, type: p.type })),
    null,
    2,
  )

  const scriptClose = '<' + '/script>'
  const templateOpen = '<' + 'template>'
  const templateClose = '<' + '/template>'

  return `<script setup lang="ts">
import { reactive, definePageMeta, onMounted } from '#imports'
import EmailsLayout from '${emailsLayoutPath}'
import EmailComponent from '${emailComponentPath}'

definePageMeta({ layout: false })
${hasProps
? `
const propDefaults = ${defaultsLiteral}
const propDefinitions = ${propDefsLiteral}

// Reactive state derived from the template's withDefaults — drives both
// the live preview and the sidebar controls.
const emailProps = reactive<Record<string, unknown>>({ ...propDefaults })

// Hydrate from URL params on mount so shared links restore state.
onMounted(() => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    params.forEach((value, key) => {
      if (key in emailProps) {
        const current = emailProps[key]
        if (typeof current === 'number') {
          const n = Number(value)
          if (!Number.isNaN(n)) emailProps[key] = n
        } else if (typeof current === 'boolean') {
          emailProps[key] = value === 'true'
        } else {
          emailProps[key] = value
        }
      }
    })
  }
})
`
: ''}
${scriptClose}

${templateOpen}
  <EmailsLayout${hasProps ? ' :email-props="emailProps" :prop-definitions="propDefinitions"' : ''}>
    <EmailComponent${hasProps ? ' v-bind="emailProps"' : ''} />
  </EmailsLayout>
${templateClose}
`
}
