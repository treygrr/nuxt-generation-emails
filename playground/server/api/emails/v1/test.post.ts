import { defineEventHandler, readBody, createError } from 'h3'
import { useNitroApp, getSendGenEmailsHandler } from '#imports'
import { render } from '@vue-email/render'
import EmailTemplate from '~/emails/v1/test.vue'
import type { TestData } from '~/emails/v1/test.data'

export default defineEventHandler(async (event) => {
  // Read the POST body as typed data. Type safety in JavaScript? What a time to be alive.
  const body = await readBody<TestData>(event)

  try {
    const html = await render(EmailTemplate, body, { pretty: true })

    const nitro = useNitroApp()
    const sendGenEmailsHandler = getSendGenEmailsHandler()

    // If sendGenEmails function is provided in config, use it
    if (sendGenEmailsHandler) {
      await sendGenEmailsHandler(html, body)
    }
    else {
      // Otherwise, call the Nitro hook to allow users to send the email
      // This is where users can hook in their Resend/SendGrid/carrier pigeon integration
      // @ts-ignore - custom hook not recognized by Nitro types at compile time
      await nitro.hooks.callHook('nuxt-gen-emails:send', {
        html,
        data: body,
      })
    }

    return {
      success: true,
      message: 'Email rendered successfully', // "Successfully" is doing a lot of work here
      html, // Return the HTML because why not, we already have it
    }
  }
  catch (error: unknown) {
    // Error handling: where we pretend we know what went wrong
    // Check instanceof Error because JavaScript lets you throw ANYTHING. Strings, numbers, objects, your dignity.
    const message = error instanceof Error ? error.message : 'Failed to render or send email'
    throw createError({
      statusCode: 500, // The universal "something broke" code
      statusMessage: message,
    })
  }
})
