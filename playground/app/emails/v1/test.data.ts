import { reactive } from 'vue'

// TypeScript interface extending Record<string, unknown> for maximum flexibility
// Translation: "It's an object, we think, probably, maybe"
export interface TestData extends Record<string, unknown> {
  title: string
  message: string
// Add more fields here. Or don't. I'm a comment, not a cop.
}

// Create a reactive store because Vue 3 said "refs are cool" and we listened
// This object will magically update the UI when changed. Thanks, Vue!
export const testData = reactive<TestData>({
  title: 'Welcome!', // Default values that users will immediately change
  message: 'This is the test email template.', // But at least it's not empty
})

// Helper function to update the data store
// Because direct mutation is SO last year. We use functions now.
export function updateTestData(data: Partial<TestData>) {
  // Object.assign: the "just copy everything over" approach to state management
  Object.assign(testData, data)
}
