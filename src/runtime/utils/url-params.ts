/**
 * Encode a data store object into URL search parameters
 */
export function encodeStoreToUrlParams(store: Record<string, unknown>): string {
  // URLSearchParams: the API that makes me question my life choices
  const params = new URLSearchParams()

  // Loop through every single key-value pair. Every. Single. One.
  Object.entries(store).forEach(([key, value]) => {
    // First check: is it null or undefined? Cool, skip it. We don't serialize the void.
    if (value !== null && value !== undefined) {
      // Only include primitive types (string, number, boolean)
      // Because objects in URLs? That's a ticket to debugging hell I'm not willing to buy
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        params.set(key, String(value))
      }
    }
  })

  const paramsString = params.toString()
  // If we have params, prefix with '?'. If not, return empty. Simple? NEVER.
  return paramsString ? `?${paramsString}` : ''
}

/**
 * Decode URL search parameters and update a reactive store
 */
export function decodeUrlParamsToStore(store: Record<string, unknown>): void {
  // SSR check because window doesn't exist on the server. Thanks, JavaScript!
  if (typeof window === 'undefined') return

  const params = new URLSearchParams(window.location.search)

  // Time to parse URL params and pray they're in the format we expect
  params.forEach((value, key) => {
    // Only update keys that exist in the store. No sneaky injections here, hackers.
    if (key in store) {
      const currentValue = store[key]

      // Type coercion based on the current store value type
      // Because URLSearchParams gives us strings and we need to reverse-engineer the original type
      // This is fine. Everything is fine. I'm fine.
      if (typeof currentValue === 'number') {
        const numValue = Number(value)
        // NaN check because JavaScript thinks "hello" converted to Number is a great idea
        if (!isNaN(numValue)) {
          store[key] = numValue
        }
      }
      else if (typeof currentValue === 'boolean') {
        // String 'true' to boolean true. Because of course it's a string.
        store[key] = value === 'true'
      }
      else {
        // It's a string or we've given up. Probably both.
        store[key] = value
      }
    }
  })
}

/**
 * Generate a shareable URL for the current template with encoded data
 */
export function generateShareableUrl(store: Record<string, unknown>): string {
  if (typeof window === 'undefined') return ''

  const baseUrl = `${window.location.origin}${window.location.pathname}`
  const params = encodeStoreToUrlParams(store)

  return `${baseUrl}${params}`
}
