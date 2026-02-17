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
 * Generate a shareable URL for the current template with encoded data
 */
export function generateShareableUrl(store: Record<string, unknown>): string {
  if (typeof window === 'undefined') return ''

  const baseUrl = `${window.location.origin}${window.location.pathname}`
  const params = encodeStoreToUrlParams(store)

  return `${baseUrl}${params}`
}
