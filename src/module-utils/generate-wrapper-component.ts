export function generateWrapperComponent(
  emailsLayoutPath: string,
  emailComponentPath: string,
): string {
  const scriptClose = '<' + '/script>'
  const templateOpen = '<' + 'template>'
  const templateClose = '<' + '/template>'

  return `<script setup lang="ts">
import { reactive, computed, watch, shallowRef, triggerRef, definePageMeta, onMounted } from '#imports'
import EmailsLayout from '${emailsLayoutPath}'
import EmailComponentRaw from '${emailComponentPath}'

definePageMeta({ layout: false })

// ---- Runtime component introspection ----
// We read prop definitions from the compiled component's .props object at
// runtime.  Vue's HMR runtime mutates .props in-place (same object ref) via
// Object.assign, so a shallowRef change won't fire.  We use triggerRef() on
// every HMR update to force the computed to re-evaluate.

const emailComponent = shallowRef(EmailComponentRaw)

if (import.meta.hot) {
  // vite:afterUpdate fires client-side after ANY HMR update is applied.
  // triggerRef is cheap — the computed just re-reads .props from the
  // already-mutated component object.
  import.meta.hot.on('vite:afterUpdate', () => {
    triggerRef(emailComponent)
  })
}

function inferType(ctor: unknown): 'string' | 'number' | 'boolean' | 'object' | 'unknown' {
  if (ctor === String) return 'string'
  if (ctor === Number) return 'number'
  if (ctor === Boolean) return 'boolean'
  if (ctor === Object || ctor === Array) return 'object'
  return 'unknown'
}

interface PropDefinition {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'unknown'
}

const introspected = computed(() => {
  const comp = emailComponent.value as any
  const raw = comp?.props
  const defs: PropDefinition[] = []
  const defaults: Record<string, unknown> = {}

  if (!raw) return { defs, defaults }

  if (Array.isArray(raw)) {
    for (const name of raw) {
      defs.push({ name, type: 'unknown' })
    }
  } else {
    for (const [name, spec] of Object.entries(raw as Record<string, any>)) {
      const ctor = spec?.type ?? spec
      defs.push({ name, type: inferType(ctor) })

      if (spec?.default !== undefined) {
        defaults[name] = typeof spec.default === 'function' ? spec.default() : spec.default
      }
    }
  }

  return { defs, defaults }
})

const propDefinitions = computed(() => introspected.value.defs)

// Reactive state that drives both the live preview and the sidebar controls.
const emailProps = reactive<Record<string, unknown>>({})

// Whenever the component's props change (HMR), reconcile the reactive state:
// add new props with their defaults, remove props that no longer exist.
watch(
  () => introspected.value,
  ({ defs, defaults }) => {
    const validNames = new Set(defs.map(d => d.name))

    // Add new props
    for (const name of validNames) {
      if (!(name in emailProps)) {
        emailProps[name] = defaults[name] ?? undefined
      }
    }

    // Remove stale props
    for (const key of Object.keys(emailProps)) {
      if (!validNames.has(key)) {
        delete emailProps[key]
      }
    }
  },
  { immediate: true },
)

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
        } else if (typeof current === 'object' && current !== null) {
          try {
            emailProps[key] = JSON.parse(value)
          } catch {
            // If JSON parse fails, leave the default value
          }
        } else {
          emailProps[key] = value
        }
      }
    })
  }
})
${scriptClose}

${templateOpen}
  <EmailsLayout :email-props="emailProps" :prop-definitions="propDefinitions">
    <component :is="emailComponent" v-bind="emailProps" />
  </EmailsLayout>
${templateClose}
`
}
