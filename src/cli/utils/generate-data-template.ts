export function generateDataTemplate(emailName: string): string {
  // Capitalize for the TypeScript interface name because we're proper adults here
  const className = emailName.charAt(0).toUpperCase() + emailName.slice(1)

  // Generate a reactive data store with TypeScript types
  // Because untyped data is for barbarians and we have STANDARDS (that we'll ignore later)
  return `import { reactive } from 'vue'

// TypeScript interface extending Record<string, unknown> for maximum flexibility
// Translation: "It's an object, we think, probably, maybe"
export interface ${className}Data extends Record<string, unknown> {
  title: string
  message: string
// Add more fields here. Or don't. I'm a comment, not a cop.
}

// Create a reactive store because Vue 3 said "refs are cool" and we listened
// This object will magically update the UI when changed. Thanks, Vue!
export const ${emailName}Data = reactive<${className}Data>({
  title: 'Welcome!', // Default values that users will immediately change
  message: 'This is the ${emailName} email template.', // But at least it's not empty
})

// Helper function to update the data store
// Because direct mutation is SO last year. We use functions now.
export function update${className}Data(data: Partial<${className}Data>) {
  // Object.assign: the "just copy everything over" approach to state management
  Object.assign(${emailName}Data, data)
}
`
}
