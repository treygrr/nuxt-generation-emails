import { useRuntimeConfig } from '#imports'

/**
 * Get the sendGenEmails handler function from runtime config
 * This allows users to provide a custom function for sending emails
 * while keeping the logic decoupled from the API routes
 *
 * @returns The sendGenEmails function if provided, or null
 */
export function getSendGenEmailsHandler(): ((html: string, data: Record<string, unknown>) => Promise<void> | void) | null {
  const config = useRuntimeConfig()

  // Return the function if it exists in the config
  if (config.nuxtGenEmails?.sendGenEmails && typeof config.nuxtGenEmails.sendGenEmails === 'function') {
    return config.nuxtGenEmails.sendGenEmails
  }

  return null
}
