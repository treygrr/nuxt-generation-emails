<script setup lang="ts">
import EmailTemplateSelector from '../components/EmailTemplateSelector.vue'
import ApiTester from '../components/ApiTester.vue'
import { computed, generateShareableUrl, ref, useAttrs, useRoute, useRouter } from '#imports'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const props = defineProps<{
  emailStore?: Record<string, unknown>
}>()

const route = useRoute()
const router = useRouter()

// Check if this is a server request (for API route fetching)
const isServerRequest = computed(() => route.query.server === 'true')

const templates = computed(() => {
  // Get all routes that start with /__emails/
  return router.getRoutes()
    .filter(route => route.path.startsWith('/__emails/'))
    .map(route => route.path.replace('/__emails/', ''))
    .sort()
})

const showControls = ref(true)
const copySuccess = ref(false)

type EditableField = {
  key: string
  type: 'string' | 'number'
}

// Extract the data object from the store (it's the reactive object with the actual data)
// This is where things get spicy. We need to find the ONE object that contains the actual data
// while ignoring all the utility functions and TypeScript types that Vue so kindly bundles together
const dataObject = computed<Record<string, unknown> | null>(() => {
  if (!props.emailStore) return null

  // Find the reactive data object (exclude functions and interfaces)
  // Translation: fish through the prop soup to find actual data, not the helper functions
  // We check: is it an object? Is it not null? Does the key NOT start with 'update'?
  // If yes to all three, BINGO. We found our data. Probably. Maybe. Fingers crossed.
  const dataKey = Object.keys(props.emailStore).find(key =>
    typeof props.emailStore![key] === 'object'
    && props.emailStore![key] !== null
    && !key.startsWith('update'),
  )

  return dataKey ? props.emailStore[dataKey] as Record<string, unknown> : null
})

// Get editable fields recursively (strings and numbers only)
const editableFields = computed<EditableField[]>(() => {
  if (!dataObject.value) return []

  return collectEditableFields(dataObject.value)
})

const previewRenderKey = computed(() => {
  if (!dataObject.value) return route.fullPath

  try {
    return `${route.fullPath}:${JSON.stringify(dataObject.value)}`
  }
  catch {
    return route.fullPath
  }
})

function formatFieldLabel(key: string): string {
  return key
    .split('.')
    .map((segment) => {
      if (/^\d+$/.test(segment)) return `[${segment}]`
      const words = segment.replace(/([A-Z])/g, ' $1').trim()
      return words.charAt(0).toUpperCase() + words.slice(1)
    })
    .join(' → ')
}

function getFieldId(key: string): string {
  return `field-${key.replace(/[^\w-]/g, '-')}`
}

function collectEditableFields(value: unknown, path: string[] = [], visited: WeakSet<object> = new WeakSet()): EditableField[] {
  if (typeof value === 'string') {
    return [{ key: path.join('.'), type: 'string' }]
  }

  if (typeof value === 'number') {
    return [{ key: path.join('.'), type: 'number' }]
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectEditableFields(item, [...path, String(index)], visited))
  }

  if (typeof value === 'object' && value !== null) {
    if (visited.has(value)) return []
    visited.add(value)

    return Object.entries(value).flatMap(([key, nestedValue]) =>
      collectEditableFields(nestedValue, [...path, key], visited),
    )
  }

  return []
}

function getValueAtPath(path: string): unknown {
  if (!dataObject.value) return undefined

  return path.split('.').reduce<unknown>((currentValue, segment) => {
    if (currentValue === null || currentValue === undefined) return undefined

    const key: string | number = /^\d+$/.test(segment) ? Number(segment) : segment
    return (currentValue as Record<string | number, unknown>)[key]
  }, dataObject.value)
}

function setValueAtPath(path: string, value: string, type: EditableField['type']): void {
  if (!dataObject.value) return

  const segments = path.split('.')
  const lastSegment = segments.pop()
  if (!lastSegment) return

  const parent = segments.reduce<unknown>((currentValue, segment) => {
    if (currentValue === null || currentValue === undefined) return undefined

    const key: string | number = /^\d+$/.test(segment) ? Number(segment) : segment
    return (currentValue as Record<string | number, unknown>)[key]
  }, dataObject.value)

  if (parent === null || parent === undefined || typeof parent !== 'object') return

  const finalKey: string | number = /^\d+$/.test(lastSegment) ? Number(lastSegment) : lastSegment
  if (type === 'number') {
    const parsed = Number(value)
    ;(parent as Record<string | number, unknown>)[finalKey] = Number.isNaN(parsed) ? 0 : parsed
    return
  }

  ;(parent as Record<string | number, unknown>)[finalKey] = value
}

async function copyShareableUrl() {
  if (!dataObject.value) return

  const url = generateShareableUrl(dataObject.value)

  try {
    await navigator.clipboard.writeText(url)
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  }
  catch (error) {
    console.error('Failed to copy URL:', error)
  }
}
</script>

<template>
  <!-- Server mode: render only the email content -->
  <slot v-if="isServerRequest" />

  <!-- Client mode: render full preview UI -->
  <div
    v-else
    v-bind="attrs"
    class="nge-email-preview"
  >
    <div class="nge-email-preview__toolbar">
      <div class="nge-email-preview__title">
        Email Template
      </div>
      <div class="nge-email-preview__toolbar-actions">
        <EmailTemplateSelector :templates="templates" />
        <button
          v-if="emailStore"
          class="nge-email-preview__toggle"
          @click="copyShareableUrl"
        >
          {{ copySuccess ? '✓ Copied!' : 'Share URL' }}
        </button>
        <button
          v-if="emailStore"
          class="nge-email-preview__toggle"
          @click="showControls = !showControls"
        >
          {{ showControls ? 'Hide' : 'Show' }} Controls
        </button>
      </div>
    </div>
    <div class="nge-email-preview__container">
      <div
        v-if="emailStore && showControls && dataObject"
        class="nge-email-preview__controls"
      >
        <div class="nge-email-preview__controls-header">
          <h3>Template Data</h3>
        </div>
        <div class="nge-email-preview__controls-content">
          <div
            v-for="field in editableFields"
            :key="field.key"
            class="nge-email-preview__control"
          >
            <label :for="getFieldId(field.key)">{{ formatFieldLabel(field.key) }}</label>
            <input
              v-if="field.type === 'string'"
              :id="getFieldId(field.key)"
              :value="getValueAtPath(field.key)"
              type="text"
              class="nge-email-preview__input"
              @input="setValueAtPath(field.key, ($event.target as HTMLInputElement).value, field.type)"
            >
            <input
              v-else-if="field.type === 'number'"
              :id="getFieldId(field.key)"
              :value="getValueAtPath(field.key)"
              type="number"
              class="nge-email-preview__input"
              @input="setValueAtPath(field.key, ($event.target as HTMLInputElement).value, field.type)"
            >
          </div>
          <ApiTester :data-object="dataObject" />
        </div>
      </div>
      <div class="nge-email-preview__content">
        <ClientOnly>
          <div :key="previewRenderKey">
            <slot />
          </div>
          <template #fallback>
            <div class="nge-email-preview__placeholder">
              Loading preview...
            </div>
          </template>
        </ClientOnly>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nge-email-preview {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #f9fafb;
}

.nge-email-preview__toolbar {
  background: linear-gradient(to right, #047857, #059669);
  color: white;
  padding: 14px 24px;
  font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  position: sticky;
  top: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.nge-email-preview__toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nge-email-preview__title {
  font-weight: 600;
  font-size: 15px;
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  gap: 8px;
}

.nge-email-preview__title::before {
  content: '✉';
  font-size: 18px;
}

.nge-email-preview__toggle {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: -0.01em;
}

.nge-email-preview__toggle:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.nge-email-preview__toggle:active {
  transform: translateY(0);
}

.nge-email-preview__container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.nge-email-preview__controls {
  width: 320px;
  background: white;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.04);
}

.nge-email-preview__controls-header {
  padding: 20px 24px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.nge-email-preview__controls-header h3 {
  margin: 0;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  letter-spacing: -0.01em;
}

.nge-email-preview__controls-content {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.nge-email-preview__control {
  margin-bottom: 20px;
}

.nge-email-preview__control:last-child {
  margin-bottom: 0;
}

.nge-email-preview__control label {
  display: block;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
  letter-spacing: -0.01em;
}

.nge-email-preview__input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  background: white;
  color: #111827;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  box-sizing: border-box;
}

.nge-email-preview__input:hover {
  border-color: #9ca3af;
}

.nge-email-preview__input:focus {
  outline: none;
  border-color: #047857;
  box-shadow: 0 0 0 3px rgba(4, 120, 87, 0.1), 0 1px 2px rgba(0, 0, 0, 0.05);
}

.nge-email-preview__input::placeholder {
  color: #9ca3af;
}

.nge-email-preview__content {
  flex: 1;
  overflow-y: auto;
  background: #f9fafb;
}

.nge-email-preview__placeholder {
  padding: 24px;
  color: #6b7280;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
}
</style>
