<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from '#imports'

const props = defineProps<{
  dataObject: Record<string, unknown>
}>()

const route = useRoute()
const isLoading = ref(false)
const response = ref<string>('')
const error = ref<string>('')
const copySuccess = ref(false)

const apiEndpoint = computed(() => {
  const templatePath = route.path.replace('/__emails/', '')
  return `/api/emails/${templatePath}`
})

async function testApi() {
  // Set loading state and clear previous results
  // Because showing stale data is how you lose users' trust
  isLoading.value = true
  error.value = ''
  response.value = ''

  try {
    // Make the POST request with our data object
    // Pray to the HTTP gods that the network doesn't fail
    const result = await $fetch(apiEndpoint.value, {
      method: 'POST',
      body: props.dataObject,
    })

    // Pretty print the JSON because we're not animals
    response.value = JSON.stringify(result, null, 2)
  }
  catch (err: unknown) {
    // Error handling: the part of coding where we pretend we know what went wrong
    // Check if it's an Error object or just... something else. Because JavaScript.
    error.value = err instanceof Error ? err.message : 'Failed to test API'
    // Stringify the error too because sometimes you need to see the whole disaster
    response.value = JSON.stringify(err, null, 2)
  }
  finally {
    // Finally block: where we clean up our mess regardless of success or failure
    isLoading.value = false
  }
}

async function copyResponse() {
  if (!response.value) return

  try {
    await navigator.clipboard.writeText(response.value)
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  }
  catch (error) {
    console.error('Failed to copy response:', error)
  }
}
</script>

<template>
  <div class="nge-api-tester">
    <div class="nge-api-tester__header">
      <h4>API Tester</h4>
      <button
        class="nge-api-tester__button"
        :disabled="isLoading"
        @click="testApi"
      >
        {{ isLoading ? 'Testing...' : 'Test POST Request' }}
      </button>
    </div>
    <div class="nge-api-tester__endpoint">
      <code>POST {{ apiEndpoint }}</code>
    </div>
    <div
      v-if="error"
      class="nge-api-tester__error"
    >
      {{ error }}
    </div>
    <div
      v-if="response"
      class="nge-api-tester__response"
    >
      <div class="nge-api-tester__response-header">
        <span class="nge-api-tester__response-label">Response</span>
        <button
          class="nge-api-tester__copy-button"
          @click="copyResponse"
        >
          {{ copySuccess ? '✓ Copied' : 'Copy' }}
        </button>
      </div>
      <textarea
        class="nge-api-tester__output"
        :value="response"
        readonly
        placeholder="Response will appear here..."
      />
    </div>
  </div>
</template>

<style scoped>
.nge-api-tester {
  border-top: 1px solid #e5e7eb;
  padding-top: 24px;
  margin-top: 24px;
}

.nge-api-tester__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.nge-api-tester__header h4 {
  margin: 0;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  letter-spacing: -0.01em;
}

.nge-api-tester__button {
  background: #047857;
  color: white;
  border: none;
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: -0.01em;
}

.nge-api-tester__button:hover:not(:disabled) {
  background: #065f46;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(4, 120, 87, 0.3);
}

.nge-api-tester__button:active:not(:disabled) {
  transform: translateY(0);
}

.nge-api-tester__button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.nge-api-tester__endpoint {
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.nge-api-tester__endpoint code {
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 11px;
  color: #374151;
  word-break: break-all;
}

.nge-api-tester__error {
  margin-bottom: 12px;
  padding: 10px 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 12px;
}

.nge-api-tester__response {
  margin-top: 12px;
}

.nge-api-tester__response-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.nge-api-tester__response-label {
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  letter-spacing: -0.01em;
}

.nge-api-tester__copy-button {
  background: #047857;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 11px;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: -0.01em;
}

.nge-api-tester__copy-button:hover {
  background: #065f46;
}

.nge-api-tester__output {
  width: 100%;
  min-height: 200px;
  max-height: 400px;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 11px;
  line-height: 1.5;
  background: #f9fafb;
  color: #111827;
  resize: vertical;
  box-sizing: border-box;
}

.nge-api-tester__output:focus {
  outline: none;
  border-color: #047857;
  box-shadow: 0 0 0 3px rgba(4, 120, 87, 0.1);
}
</style>
