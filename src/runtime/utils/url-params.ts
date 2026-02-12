/**
 * Encode a data store object into URL search parameters.
 * Primitive values are stored as-is. Objects and arrays are JSON-stringified.
 */
export function encodeStoreToUrlParams(store: Record<string, unknown>): string {
  const params = new URLSearchParams()

  Object.entries(store).forEach(([key, value]) => {
    if (value === null || value === undefined) return

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      params.set(key, String(value))
    }
    else if (typeof value === 'object') {
      params.set(key, JSON.stringify(value))
    }
  })

  const paramsString = params.toString()
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
