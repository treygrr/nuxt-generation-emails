export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('nuxt-gen-emails:send', async ({ html, data }: { html: string, data: Record<string, unknown> }) => {
    console.log('[gen-emails] Sending email to:', data.to)
    console.log('[gen-emails] Subject:', data.subject || 'No Subject')
    console.log('[gen-emails] HTML length:', html.length)

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.SENDGRID_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: data.to as string }],
            subject: (data.subject as string) || 'No Subject',
          },
        ],
        from: { email: (data.from as string) || 'noreply@example.com' },
        content: [
          {
            type: 'text/html',
            value: html,
          },
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`SendGrid API error (${response.status}): ${error}`)
    }

    console.log('[gen-emails] Email sent successfully')
    console.log('[gen-emails] SendGrid response status:', response.status)
    console.log('[gen-emails] SendGrid response body:', await response.text())
  })
})
