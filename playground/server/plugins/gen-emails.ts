import sgMail from '@sendgrid/mail'

type SendData<TAdditional extends Record<string, unknown> = Record<string, unknown>> = {
  to?: string
  from?: string
  subject?: string
} & TAdditional

interface NuxtGenEmailsSendPayload<TSendData extends Record<string, unknown> = SendData> {
  html: string
  data: TSendData
}

export default defineNitroPlugin((nitro) => {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

  nitro.hooks.hook('nuxt-generation-emails:send', async ({ html, data }: NuxtGenEmailsSendPayload) => {
    const msg = {
      to: data.to as string,
      from: (data.from as string) || 'webdevtesters@platt.com',
      subject: (data.subject as string) || 'No Subject',
      html,
    }

    try {
      const [response] = await sgMail.send(msg)
      console.log('[gen-emails] Email sent successfully')
      console.log('[gen-emails] SendGrid response status:', response.statusCode)
      console.log('[gen-emails] SendGrid response headers:', response.headers)
      console.log('[gen-emails] SendGrid response body:', response.body)
    }
    catch (error) {
      console.error('[gen-emails] SendGrid error:', error)
      throw error
    }
  })
})
