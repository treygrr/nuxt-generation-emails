<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from '#imports'

interface TreeNode {
  name: string
  path: string
  isDirectory: boolean
  children?: TreeNode[]
}

const props = defineProps<{
  templates: string[]
}>()

const route = useRoute()
const router = useRouter()
const isOpen = ref(false)
const expandedDirs = ref<Set<string>>(new Set())

const currentTemplate = computed(() => {
  return route.path.replace('/__emails/', '') || 'Select a template'
})

// Build tree structure from flat template list
// Time to convert a flat array into a nested tree structure
// Because humans think in hierarchies and computers think in flat arrays
// The eternal struggle continues
const templateTree = computed(() => {
  const tree: TreeNode[] = []

  // For each template path like 'v1/test-email', we need to create nested objects
  props.templates.forEach((template) => {
    const parts = template.split('/')  // ['v1', 'test-email']
    let currentLevel = tree  // Start at the root, obviously

    // Loop through each part of the path and build the tree
    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1  // Is this the actual file or just a folder?
      const path = parts.slice(0, index + 1).join('/')  // Build incremental path

      // Check if this node already exists (because we might have multiple files in same folder)
      let existing = currentLevel.find(node => node.name === part)

      if (!existing) {
        // Create a new node because this part of the path doesn't exist yet
        // TypeScript is yelling at me but I know what I'm doing (I don't)
        existing = {
          name: part,
          path: isLast ? template : path,
          isDirectory: !isLast,
          children: !isLast ? [] : undefined,  // Folders get children, files get undefined. Makes total sense.
        }
        currentLevel.push(existing)
      }

      // If not the last part and has children, dive deeper into the tree
      // Recursion's cooler cousin: iteration with state mutation
      if (!isLast && existing.children) {
        currentLevel = existing.children
      }
    })
  })

  return tree
})

function selectTemplate(template: string) {
  router.push(`/__emails/${template}`)
  isOpen.value = false
}

function toggleDirectory(path: string, event: MouseEvent) {
  event.stopPropagation()
  if (expandedDirs.value.has(path)) {
    expandedDirs.value.delete(path)
  }
  else {
    expandedDirs.value.add(path)
  }
}

function toggleDropdown() {
  isOpen.value = !isOpen.value
}

// Close dropdown when clicking outside
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.nge-template-selector')) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="nge-template-selector">
    <button
      class="nge-template-selector__trigger"
      @click="toggleDropdown"
    >
      <span class="nge-template-selector__label">{{ currentTemplate }}</span>
      <svg
        class="nge-template-selector__icon"
        :class="{ 'nge-template-selector__icon--open': isOpen }"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
      >
        <path
          d="M4 6L8 10L12 6"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
    <div
      v-if="isOpen"
      class="nge-template-selector__dropdown"
    >
      <template
        v-for="node in templateTree"
        :key="node.path"
      >
        <div
          v-if="node.isDirectory"
          class="nge-template-selector__directory"
        >
          <div
            class="nge-template-selector__dir-header"
            @click="toggleDirectory(node.path, $event)"
          >
            <svg
              class="nge-template-selector__dir-icon"
              :class="{ 'nge-template-selector__dir-icon--open': expandedDirs.has(node.path) }"
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
            <span>{{ node.name }}</span>
          </div>
          <div
            v-if="expandedDirs.has(node.path)"
            class="nge-template-selector__dir-content"
          >
            <div
              v-for="child in node.children"
              :key="child.path"
              class="nge-template-selector__item"
              :class="{ 'nge-template-selector__item--active': child.path === currentTemplate }"
              @click="selectTemplate(child.path)"
            >
              {{ child.name }}
            </div>
          </div>
        </div>
        <div
          v-else
          class="nge-template-selector__item"
          :class="{ 'nge-template-selector__item--active': node.path === currentTemplate }"
          @click="selectTemplate(node.path)"
        >
          {{ node.name }}
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.nge-template-selector {
  position: relative;
}

.nge-template-selector__trigger {
  display: flex;
  align-items: center;
  gap: 8px;
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
  min-width: 200px;
  justify-content: space-between;
}

.nge-template-selector__trigger:hover {
  background: rgba(255, 255, 255, 0.25);
}

.nge-template-selector__label {
  flex: 1;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nge-template-selector__icon {
  flex-shrink: 0;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.nge-template-selector__icon--open {
  transform: rotate(180deg);
}

.nge-template-selector__dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 10px rgba(0, 0, 0, 0.05);
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  animation: slideDown 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.nge-template-selector__item {
  padding: 10px 16px;
  color: #374151;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
  font-weight: 450;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: all 0.15s ease;
  border-bottom: 1px solid #f3f4f6;
}

.nge-template-selector__item:last-child {
  border-bottom: none;
}

.nge-template-selector__item:hover {
  background: #f9fafb;
  color: #00dc82;
}

.nge-template-selector__item--active {
  background: #f0fdf4;
  color: #00dc82;
  font-weight: 500;
}

.nge-template-selector__item--active::before {
  content: '✓';
  margin-right: 8px;
  color: #00dc82;
}

.nge-template-selector__directory {
  border-bottom: 1px solid #f3f4f6;
}

.nge-template-selector__directory:last-child {
  border-bottom: none;
}

.nge-template-selector__dir-header {
  padding: 10px 16px;
  color: #111827;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fafafa;
}

.nge-template-selector__dir-header:hover {
  background: #f3f4f6;
}

.nge-template-selector__dir-icon {
  flex-shrink: 0;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  color: #6b7280;
}

.nge-template-selector__dir-icon--open {
  transform: rotate(90deg);
}

.nge-template-selector__dir-content {
  background: white;
}

.nge-template-selector__dir-content .nge-template-selector__item {
  padding-left: 36px;
  border-bottom: 1px solid #f9fafb;
}

.nge-template-selector__dir-content .nge-template-selector__item:last-child {
  border-bottom: none;
  color: #00dc82;
}
</style>
