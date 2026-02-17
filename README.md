# nuxt-generation-emails

[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

A Nuxt module for authoring, previewing, and sending transactional email templates — all from inside your Nuxt app.

## ✨ Features

- 📧 **Vue-powered email templates** — Build emails with `@vue-email/components` and Tailwind CSS
- 🔌 **Auto-generated API routes** — Every template gets a `POST /api/emails/...` endpoint automatically
- 🖥️ **Live preview UI** — Browse and tweak templates at `/__emails/` with a built-in props editor
- 🛠️ **CLI scaffolding** — `nuxt-gen-emails add` creates templates with the right structure instantly
- 🔄 **Hot reload** — New templates are detected automatically during dev (server restarts to register routes)
- 📋 **OpenAPI docs** — Generated routes include full OpenAPI metadata out of the box
- 🔗 **Shareable URLs** — Share template previews with pre-filled prop values via URL params

---

## 📦 1. Installation

Add the module to your Nuxt 4+ project with one command:

```bash
npx nuxt module add nuxt-generation-emails
```

Or install manually:

```bash
npm install nuxt-generation-emails
```

Then add it to your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-generation-emails'],

  nuxtGenerationEmails: {
    // Directory for email templates (relative to your app's srcDir)
    emailDir: 'emails', // default
  },
})
```

> **Tip:** Enable Nitro's OpenAPI support to get auto-generated API docs for every email endpoint:
>
> ```ts
> nitro: {
>   experimental: {
>     openAPI: true,
>   },
> },
> ```

---

## 📁 2. Folder Structure

Templates live inside your app's source directory under the configured `emailDir` (default: `emails/`). You can nest them in subdirectories to organize by version, category, or however you like.

```
app/
  emails/
    v1/
      order-confirmation.vue
      welcome.vue
    v2/
      order-confirmation.vue
    marketing/
      promo.vue
```

The directory structure maps directly to routes:

| Template file                          | Preview URL                               | API endpoint                             |
|----------------------------------------|-------------------------------------------|------------------------------------------|
| `emails/v1/order-confirmation.vue`     | `/__emails/v1/order-confirmation`         | `POST /api/emails/v1/order-confirmation` |
| `emails/v1/welcome.vue`               | `/__emails/v1/welcome`                    | `POST /api/emails/v1/welcome`            |
| `emails/v2/order-confirmation.vue`     | `/__emails/v2/order-confirmation`         | `POST /api/emails/v2/order-confirmation` |
| `emails/marketing/promo.vue`          | `/__emails/marketing/promo`               | `POST /api/emails/marketing/promo`       |

---

## 🛠️ 3. Adding Templates with the CLI

The fastest way to create a new email template:

```bash
npx nuxt-gen-emails add <name>
```

### Basic usage

```bash
# Creates emails/welcome.vue
npx nuxt-gen-emails add welcome

# Creates emails/v1/order-confirmation.vue (creates v1/ if it doesn't exist)
npx nuxt-gen-emails add v1/order-confirmation

# Creates emails/marketing/campaigns/summer-sale.vue (deeply nested)
npx nuxt-gen-emails add marketing/campaigns/summer-sale
```

### Interactive directory selection

If you run the command without a path prefix, and directories already exist, the CLI will ask if you want to place the template in an existing directory:

```bash
npx nuxt-gen-emails add reset-password

# ? Would you like to select an existing directory? (y/N)
# ? Select a directory:
#   > emails/ (root)
#     emails/v1/
#     emails/v2/
#     emails/marketing/
```

### What gets generated

Every `add` command creates a single `.vue` file with a ready-to-customize starter template:

```vue
<script setup lang="ts">
import { Body, Button, Font, Head, Hr, Html, Text, Tailwind } from '@vue-email/components'

defineOptions({ name: 'WelcomeNge' })

const props = withDefaults(defineProps<{
  title?: string
  message?: string
}>(), {
  title: 'Welcome!',
  message: 'This is the welcome email template.',
})
</script>

<template>
  <Tailwind>
    <Html lang="en">
      <Head />
      <Font
        font-family="DM Sans"
        :fallback-font-family="['Arial', 'Helvetica', 'sans-serif']"
        :web-font="{ url: 'https://fonts.gstatic.com/s/dmsans/v15/rP2Hp2ywxg089UriCZOIHTWEBlw.woff2', format: 'woff2' }"
      />
      <Body style="font-family: 'DM Sans', Arial, Helvetica, sans-serif;">
        <Text>{{ props.title }}</Text>
        <p>{{ props.message }}</p>
        <Hr />
        <Button href="https://example.com">
          Click me
        </Button>
      </Body>
    </Html>
  </Tailwind>
</template>
```

If the dev server is running, it will automatically detect the new file and restart to register the new routes — no manual restart needed.

---

## ✍️ 4. Writing Email Templates

Templates are standard Vue SFCs using [`@vue-email/components`](https://vuemail.net/). Define your template's dynamic data using `defineProps` with `withDefaults`:

```vue
<script setup lang="ts">
import { Body, Button, Container, Head, Heading, Html, Text, Tailwind } from '@vue-email/components'

defineOptions({ name: 'OrderConfirmationNge' })

const props = withDefaults(defineProps<{
  customerName?: string
  orderNumber?: string
  orderDate?: string
  totalAmount?: number
}>(), {
  customerName: 'Customer',
  orderNumber: 'ORD-000000',
  orderDate: 'January 1, 2026',
  totalAmount: 0,
})
</script>

<template>
  <Tailwind>
    <Html lang="en">
      <Head />
      <Body>
        <Container>
          <Heading as="h1">Order Confirmed!</Heading>
          <Text>Hi {{ props.customerName }},</Text>
          <Text>Your order #{{ props.orderNumber }} placed on {{ props.orderDate }} is confirmed.</Text>
          <Text>Total: ${{ props.totalAmount?.toFixed(2) }}</Text>
          <Button href="https://example.com/orders">View Order</Button>
        </Container>
      </Body>
    </Html>
  </Tailwind>
</template>
```

### Key rules

1. **Use `withDefaults(defineProps<{...}>())`** — Props are extracted at build time to populate the preview UI and API example payloads
2. **Make all props optional** (`?:`) — The defaults provide sensible preview values
3. **Supported prop types** — `string`, `number`, `boolean` appear as editable fields in the preview UI. Complex types (objects, arrays) work fine but are only editable via the JSON editor

---

## 🖥️ 5. Using the Preview UI

Navigate to `/__emails/` in your browser during development to access the preview interface.

### What you'll see

- **Template selector** — A dropdown at the top of the page lists all templates, organized by directory. Click a folder to expand/collapse it, click a template name to load it.
- **Props sidebar** — String and number props appear as editable input fields on the left. Changes update the preview in real time.
- **Live preview** — The rendered email is displayed on the right, exactly as it will look when sent.
- **Share URL button** — Copies a URL with the current prop values encoded as query parameters, useful for sharing specific test states with teammates.
- **API tester** — At the bottom of the sidebar, a built-in API tester lets you fire a real `POST` request to the template's endpoint. It shows the full JSON request body (editable) and the response including the rendered HTML.

### Navigation

Every template is accessible at a direct URL matching its file path:

```
http://localhost:3000/__emails/v1/order-confirmation
http://localhost:3000/__emails/v2/welcome
```

---

## 📨 6. Wiring Up Email Sending (SendGrid Example)

The module generates `POST` endpoints for every template that render the email HTML. To actually **send** emails, provide a `sendGenEmails` function in your module config.

### With SendGrid

Install the SendGrid SDK:

```bash
npm install @sendgrid/mail
```

Configure the handler in `nuxt.config.ts`:

```ts
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export default defineNuxtConfig({
  modules: ['nuxt-generation-emails'],

  nuxtGenerationEmails: {
    emailDir: 'emails',

    sendGenEmails: async (html, data) => {
      await sgMail.send({
        to: data.to as string,
        from: 'noreply@yourdomain.com',
        subject: data.subject as string || 'No Subject',
        html,
      })
    },
  },
})
```

### How it works

When a `POST` request hits an email endpoint (e.g., `/api/emails/v1/order-confirmation`):

1. The request body is read and passed as props to the Vue email template
2. `@vue-email/render` renders the template to an HTML string
3. If `sendGenEmails` is configured, it's called with the rendered `html` and the original request `data`
4. The response always returns `{ success: true, html: "..." }` so you can inspect the rendered output

### Example API call

```bash
curl -X POST http://localhost:3000/api/emails/v1/order-confirmation \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Jane Doe",
    "orderNumber": "ORD-123456",
    "orderDate": "February 17, 2026",
    "totalAmount": 89.99,
    "to": "jane@example.com",
    "subject": "Your Order is Confirmed!"
  }'
```

### Using the Nitro hook alternative

If you prefer not to configure the handler in `nuxt.config.ts`, you can listen for the `nuxt-gen-emails:send` hook in a Nitro plugin:

```ts
// server/plugins/email-sender.ts
export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('nuxt-gen-emails:send', async ({ html, data }) => {
    // Your sending logic here
    console.log('Sending email with data:', data)
  })
})
```

---

## 🔧 7. Module Options

| Option           | Type       | Default    | Description                                                        |
|------------------|------------|------------|--------------------------------------------------------------------|
| `emailDir`       | `string`   | `'emails'` | Directory containing email templates (relative to `srcDir`)        |
| `sendGenEmails`  | `function` | `undefined`| Async function called with `(html, data)` when an email is sent    |

Full config key: `nuxtGenerationEmails`

---

## 🧩 Auto-Imports

The module auto-imports these utilities for convenience:

### Client-side

- `encodeStoreToUrlParams(store)` — Encode a props object into URL search parameters
- `generateShareableUrl(store)` — Generate a full shareable URL for the current template with encoded props

### Server-side

- `getSendGenEmailsHandler()` — Retrieve the configured `sendGenEmails` function (used internally by generated routes)

---

## 🏗️ Development

<details>
  <summary>Local development</summary>

  ```bash
  # Install dependencies
  npm install

  # Generate type stubs
  npm run dev:prepare

  # Develop with the playground
  npm run dev

  # Build the playground
  npm run dev:build

  # Run ESLint
  npm run lint

  # Run Vitest
  npm run test
  npm run test:watch
  ```

</details>

## License

[MIT](./LICENSE)

<!-- Badges -->
[license-src]: https://img.shields.io/npm/l/nuxt-generation-emails.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/nuxt-generation-emails

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt
[nuxt-href]: https://nuxt.com
