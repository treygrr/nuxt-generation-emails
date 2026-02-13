export function generateApiRoute(emailName: string, emailPath: string, testDataExampleLiteral: string = '{}'): string {
  // Capitalize because TypeScript interfaces are fancy and deserve capital letters
  const className = emailName.charAt(0).toUpperCase() + emailName.slice(1)

  // Return a generated API route that handles POST requests
  // This is code generation inception: code that writes code that handles HTTP requests
  // My therapist says this is "normal" in web development. I don't believe them.
  return `import { defineEventHandler, readBody, createError } from 'h3'
import { useNitroApp, getSendGenEmailsHandler } from '#imports'
import { render } from '@vue-email/render'
import EmailTemplate from '~/emails/${emailPath}.vue'
import type { ${className}Data } from '~/emails/${emailPath}.data'

defineRouteMeta({
  openAPI: {
    tags: ['nuxt-generation-emails'],
    summary: 'Send ${emailName} email',
    description: 'Render and send the ${emailPath} email template.',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            example: ${testDataExampleLiteral},
            additionalProperties: true,
            description: '${className}Data payload',
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Email rendered successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                html: { type: 'string' },
              },
              required: ['success', 'message', 'html'],
            },
          },
        },
      },
      500: {
        description: 'Failed to render or send email',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                statusCode: { type: 'number', example: 500 },
                statusMessage: { type: 'string' },
              },
              required: ['statusCode', 'statusMessage'],
            },
          },
        },
      },
    },
  },
})

export default defineEventHandler(async (event) => {
  // Read the POST body as typed data. Type safety in JavaScript? What a time to be alive.
  const body = await readBody<${className}Data>(event)


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
`
}
