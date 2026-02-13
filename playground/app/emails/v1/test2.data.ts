import { reactive } from 'vue'

// TypeScript interface extending Record<string, unknown> for maximum flexibility
// Translation: "It's an object, we think, probably, maybe"
export interface Test2Data extends Record<string, unknown> {
  title: string
  message: string
  sloansMessage: {
    title: string
    description: string
    someDeeper: {
      meaning: string
    }
  }
  // Add more fields here. Or don't. I'm a comment, not a cop.
}

// Create a reactive store because Vue 3 said "refs are cool" and we listened
// This object will magically update the UI when changed. Thanks, Vue!
export const test2Data = reactive<Test2Data>({
  title: 'Welcome!', // Default values that users will immediately change
  message: 'This is the test2 email template.', // But at least it's not empty
  sloansMessage: {
    title: 'some title',
    description: 'some description',
    someDeeper: {
      meaning: 'some meaning',
    },
  },
})

// Helper function to update the data store
// Because direct mutation is SO last year. We use functions now.
export function updateTest2Data(data: Partial<Test2Data>) {
  // Object.assign: the "just copy everything over" approach to state management
  Object.assign(test2Data, data)
}
