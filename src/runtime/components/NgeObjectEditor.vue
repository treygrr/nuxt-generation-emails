<script setup lang="ts">
import { ref, watch } from 'vue'

defineOptions({ name: 'NgeObjectEditor' })

const props = defineProps<{
  /** The value to edit — object, array, or primitive */
  modelValue: unknown
  /** Display label for this node */
  label: string
  /** Nesting depth for indentation (defaults to 0) */
  depth?: number
  /** Whether this node can be removed by the parent */
  removable?: boolean
  /** Increment to collapse all nodes */
  collapseSignal?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: unknown]
  'remove': []
}>()

const depth = props.depth ?? 0
const collapsed = ref(depth > 1)

watch(() => props.collapseSignal, () => {
  collapsed.value = true
})

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v)
}

function isPrimitive(v: unknown): boolean {
  return v === null || v === undefined || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
}

function entries(v: unknown): [string, unknown][] {
  if (isArray(v)) return v.map((item, i) => [String(i), item])
  if (isObject(v)) return Object.entries(v)
  return []
}

function typeLabel(v: unknown): string {
  if (isArray(v)) return `Array(${v.length})`
  if (isObject(v)) return `Object(${Object.keys(v).length})`
  return ''
}

function updateChild(key: string, childValue: unknown) {
  if (isArray(props.modelValue)) {
    const copy = [...props.modelValue]
    copy[Number(key)] = childValue
    emit('update:modelValue', copy)
  }
  else if (isObject(props.modelValue)) {
    emit('update:modelValue', { ...props.modelValue, [key]: childValue })
  }
}

function removeChild(key: string) {
  if (isArray(props.modelValue)) {
    const copy = [...props.modelValue]
    copy.splice(Number(key), 1)
    emit('update:modelValue', copy)
  }
  else if (isObject(props.modelValue)) {
    const { [key]: _, ...rest } = props.modelValue
    emit('update:modelValue', rest)
  }
}

/**
 * Create an empty value that mirrors the shape of a reference value.
 * Strings become '', numbers become 0, booleans become false,
 * arrays become [], objects recursively get blank fields.
 */
function createBlank(reference: unknown): unknown {
  if (reference === null || reference === undefined) return ''
  if (typeof reference === 'string') return ''
  if (typeof reference === 'number') return 0
  if (typeof reference === 'boolean') return false
  if (isArray(reference)) return []
  if (isObject(reference)) {
    const blank: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(reference)) {
      blank[k] = createBlank(v)
    }
    return blank
  }
  return ''
}

/**
 * Infer the shape for a new array item from existing items,
 * or for a new object key from sibling values.
 */
function addArrayItem() {
  if (!isArray(props.modelValue)) return
  const arr = props.modelValue
  // Infer shape from the first item
  const template = arr.length > 0 ? arr[0] : ''
  const newItem = createBlank(template)
  emit('update:modelValue', [...arr, newItem])
}

function updatePrimitive(value: string) {
  const current = props.modelValue
  if (typeof current === 'number') {
    const n = Number(value)
    emit('update:modelValue', Number.isNaN(n) ? 0 : n)
  }
  else if (typeof current === 'boolean') {
    emit('update:modelValue', value === 'true')
  }
  else {
    emit('update:modelValue', value)
  }
}

function inputType(v: unknown): string {
  if (typeof v === 'number') return 'number'
  return 'text'
}
</script>

<template>
  <!-- Primitive value: render inline input -->
  <div
    v-if="isPrimitive(modelValue)"
    class="nge-obj-editor__field"
  >
    <div class="nge-obj-editor__field-header">
      <label class="nge-obj-editor__label">{{ label }}</label>
      <button
        v-if="removable"
        class="nge-obj-editor__remove-btn"
        title="Remove"
        @click="emit('remove')"
      >
        &times;
      </button>
    </div>
    <input
      class="nge-obj-editor__input"
      :type="inputType(modelValue)"
      :value="modelValue ?? ''"
      @input="updatePrimitive(($event.target as HTMLInputElement).value)"
    >
  </div>

  <!-- Object or Array: collapsible group -->
  <div
    v-else
    class="nge-obj-editor__group"
    :class="{ 'nge-obj-editor__group--nested': depth > 0 }"
  >
    <div class="nge-obj-editor__toggle-row">
      <button
        class="nge-obj-editor__toggle"
        @click="collapsed = !collapsed"
      >
        <svg
          class="nge-obj-editor__chevron"
          :class="{ 'nge-obj-editor__chevron--open': !collapsed }"
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M6 4L10 8L6 12"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span class="nge-obj-editor__toggle-label">{{ label }}</span>
        <span class="nge-obj-editor__toggle-type">{{ typeLabel(modelValue) }}</span>
      </button>
      <button
        v-if="removable"
        class="nge-obj-editor__remove-btn"
        title="Remove"
        @click="emit('remove')"
      >
        &times;
      </button>
    </div>
    <div
      v-if="!collapsed"
      class="nge-obj-editor__children"
    >
      <NgeObjectEditor
        v-for="[key, child] in entries(modelValue)"
        :key="key"
        :model-value="child"
        :label="isArray(modelValue) ? `[${key}]` : key"
        :depth="depth + 1"
        :removable="!isPrimitive(child)"
        :collapse-signal="collapseSignal"
        @update:model-value="updateChild(key, $event)"
        @remove="removeChild(key)"
      />
      <button
        v-if="isArray(modelValue)"
        class="nge-obj-editor__add-btn"
        @click="addArrayItem"
      >
        + Add item
      </button>
    </div>
  </div>
</template>

<style scoped>
.nge-obj-editor__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.nge-obj-editor__field-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nge-obj-editor__label {
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  letter-spacing: -0.01em;
}

.nge-obj-editor__input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
  color: #111827;
  background: #fff;
  box-sizing: border-box;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.nge-obj-editor__input:hover {
  border-color: #9ca3af;
}

.nge-obj-editor__input:focus {
  outline: none;
  border-color: #047857;
  box-shadow: 0 0 0 2px rgba(4, 120, 87, 0.12);
}

.nge-obj-editor__group {
  margin-bottom: 4px;
}

.nge-obj-editor__group--nested {
  margin-left: 0;
  border-left: 2px solid #e5e7eb;
  padding-left: 12px;
  margin-bottom: 6px;
}

.nge-obj-editor__toggle-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nge-obj-editor__toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  padding: 6px 8px;
  border: none;
  border-radius: 6px;
  background: #f3f4f6;
  cursor: pointer;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
  color: #111827;
  transition: background 0.15s;
  text-align: left;
}

.nge-obj-editor__toggle:hover {
  background: #e5e7eb;
}

.nge-obj-editor__chevron {
  flex-shrink: 0;
  transition: transform 0.15s ease;
  color: #6b7280;
}

.nge-obj-editor__chevron--open {
  transform: rotate(90deg);
}

.nge-obj-editor__toggle-label {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nge-obj-editor__toggle-type {
  font-size: 11px;
  color: #9ca3af;
  margin-left: auto;
  flex-shrink: 0;
}

.nge-obj-editor__children {
  padding: 8px 0 4px 0;
}

.nge-obj-editor__remove-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #9ca3af;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.15s;
  padding: 0;
}

.nge-obj-editor__remove-btn:hover {
  background: #fef2f2;
  color: #dc2626;
}

.nge-obj-editor__add-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  padding: 6px 8px;
  border: 1px dashed #d1d5db;
  border-radius: 6px;
  background: transparent;
  color: #6b7280;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  margin-top: 4px;
}

.nge-obj-editor__add-btn:hover {
  border-color: #047857;
  color: #047857;
  background: rgba(4, 120, 87, 0.04);
}
</style>
