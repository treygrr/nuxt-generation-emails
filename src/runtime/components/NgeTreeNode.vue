<script setup lang="ts">
defineOptions({ name: 'NgeTreeNode' })

interface TreeNode {
  name: string
  path: string
  isDirectory: boolean
  children?: TreeNode[]
}

defineProps<{
  node: TreeNode
  currentTemplate: string
  expandedDirs: Set<string>
}>()

const emit = defineEmits<{
  select: [template: string]
  toggle: [path: string, event: MouseEvent]
}>()
</script>

<template>
  <div
    v-if="node.isDirectory"
    class="nge-template-selector__directory"
  >
    <div
      class="nge-template-selector__dir-header"
      @click="emit('toggle', node.path, $event)"
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
      <template
        v-for="child in node.children"
        :key="child.path"
      >
        <NgeTreeNode
          :node="child"
          :current-template="currentTemplate"
          :expanded-dirs="expandedDirs"
          @select="(t: string) => emit('select', t)"
          @toggle="(p: string, e: MouseEvent) => emit('toggle', p, e)"
        />
      </template>
    </div>
  </div>
  <div
    v-else
    class="nge-template-selector__item"
    :class="{ 'nge-template-selector__item--active': node.path === currentTemplate }"
    @click="emit('select', node.path)"
  >
    {{ node.name }}
  </div>
</template>
