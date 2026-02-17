import sgMail from '@sendgrid/mail'

export default defineNitroPlugin((nitro) => {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

  nitro.hooks.hook('nuxt-gen-emails:send', async ({ html, data }: { html: string, data: Record<string, unknown> }) => {
    console.log('[gen-emails] Sending email to:', data.to)
    console.log('[gen-emails] Subject:', data.subject || 'No Subject')
    console.log('[gen-emails] HTML length:', html.length)

    const msg = {
      to: data.to as string,
      from: (data.from as string) || 'webdevtesters@platt.com',
      subject: (data.subject as string) || 'No Subject',
      html,
    }

    console.log('[gen-emails] Email message object:', msg)

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
