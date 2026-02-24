# nuxt-generation-emails

[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

A Nuxt module for authoring, previewing, and sending transactional email templates using **MJML** and **Handlebars**. Write your layouts in MJML, use Handlebars for dynamic content, preview everything live with a rich props editor, and send through any provider via a Nitro hook.

## Features

- **MJML + Handlebars templates** — Write email layouts in MJML with Handlebars expressions for variables, loops, and conditionals
- **Reusable MJML components** — Place `.mjml` snippets in `components/` and include them with `{{> name}}`
- **Auto-generated API routes** — Every template gets a typed `POST /api/emails/...` endpoint
- **Live preview with props editor** — Edit strings, numbers, objects, and arrays in a sidebar; see changes instantly
- **Complex prop support** — Nested objects and arrays render as collapsible editors; API routes pass all data straight through
- **CLI scaffolding** — `setup` for first-time project structure, `add` for new templates
- **Hot reload** — New templates and components are detected automatically during dev
- **OpenAPI docs** — Generated routes include full OpenAPI metadata
- **Shareable URLs** — Share template previews with pre-filled prop values via URL params

---

## Quick Start

### 1. Install

```bash
npx nuxt module add nuxt-generation-emails
```

Or manually:

```bash
npm install nuxt-generation-emails
```

Add to `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-generation-emails'],
})
```

### 2. Run Setup (Recommended)

Scaffold the emails directory with example templates and reusable components:

```bash
npx nuxt-gen-emails setup
```

This creates:

```
app/
  emails/
    components/
      header.mjml      # Branded header component
      divider.mjml      # Horizontal divider component
      footer.mjml       # Unsubscribe footer component
    example.mjml        # MJML template using all three components
    example.vue         # Vue SFC that compiles and renders the template
```

Start the dev server and visit `/__emails/example` to see it in action.

### Editor Setup

For the best experience editing `.mjml` files with Handlebars syntax, install these VS Code extensions:

- [MJML](https://marketplace.visualstudio.com/items?itemName=mjmlio.vscode-mjml) — MJML tag previews and validation
- [Handlebars](https://marketplace.visualstudio.com/items?itemName=andrejunges.handlebars) — Syntax highlighting for `{{}}` expressions

Then add this to your `.vscode/settings.json` so `.mjml` files get Handlebars highlighting (which also covers HTML/XML tags like `<mj-section>`):

```json
{
  "files.associations": { "*.mjml": "handlebars" }
}
```

### 3. Add More Templates

```bash
npx nuxt-gen-emails add welcome
npx nuxt-gen-emails add v1/order-confirmation
npx nuxt-gen-emails add marketing/campaigns/summer-sale
```

Each command creates a `.vue` + `.mjml` pair with a ready-to-customize starter template.

---

## How Templates Work

Every email is a pair of files:

- **`.mjml`** — The email layout using MJML tags and Handlebars expressions
- **`.vue`** — A Vue SFC that compiles the MJML template and defines the props

### MJML Template (`example.mjml`)

```handlebars
<mjml>
  <mj-head>
    <mj-preview>{{previewText}}</mj-preview>
  </mj-head>
  <mj-body>
    {{> header}}

    <mj-section>
      <mj-column>
        <mj-text>{{heading}}</mj-text>
        <mj-text>{{message}}</mj-text>
      </mj-column>
    </mj-section>

    {{#each sections}}
    <mj-section>
      <mj-column>
        <mj-text>{{this.heading}}</mj-text>
        <mj-text>{{this.body}}</mj-text>
      </mj-column>
    </mj-section>
    {{/each}}

    {{> footer}}
  </mj-body>
</mjml>
```

### Vue Component (`example.vue`)

```vue
<script setup lang="ts">
defineOptions({ name: 'ExampleNge' })

interface ContentSection {
  heading: string
  body: string
}

const props = withDefaults(defineProps<{
  previewText?: string
  heading?: string
  message?: string
  sections?: ContentSection[]
}>(), {
  previewText: 'You have a new message.',
  heading: 'Welcome!',
  message: 'Hello from your email template.',
  sections: () => [
    { heading: 'Section 1', body: 'First section content.' },
    { heading: 'Section 2', body: 'Second section content.' },
  ],
})

useNgeTemplate('example', props)
</script>
```

### Key architecture rules

1. **Every Handlebars variable must be a direct prop** — No computed values or transformations. The server-side API route passes `templateData` straight to the Handlebars template, so if a variable isn't a prop, it won't render when sending.
2. **Use `withDefaults(defineProps<{...}>())`** — Props and defaults are extracted at build time for the preview UI, API docs, and OpenAPI metadata.
3. **Make all props optional** (`?:`) — Defaults provide sensible preview values.

### Common MJML components

Templates use [MJML](https://documentation.mjml.io/) for email-safe layouts. Here are the most commonly used tags:

| Tag | Purpose |
|-----|---------|
| `<mjml>` | Root element wrapping the entire email |
| `<mj-head>` | Contains styles, fonts, attributes, and preview text |
| `<mj-body>` | Email body — all visible content goes here |
| `<mj-section>` | Full-width row container (like a `<tr>`) |
| `<mj-column>` | Column within a section (auto-stacks on mobile) |
| `<mj-text>` | Text block with inline styles |
| `<mj-button>` | Call-to-action link styled as a button |
| `<mj-image>` | Responsive image with `src`, `alt`, `width` |
| `<mj-divider>` | Horizontal rule / separator |
| `<mj-spacer>` | Vertical spacing |
| `<mj-social>` | Social media icon row |
| `<mj-preview>` | Invisible preheader text shown in inbox previews |
| `<mj-font>` | Web font loading via `@font-face` |
| `<mj-attributes>` | Set default styles for all tags of a type |

See the full [MJML documentation](https://documentation.mjml.io/) for all available tags and attributes.

---

## Reusable MJML Components

Place `.mjml` files in `emails/components/` to create reusable snippets. Each file is registered as a Handlebars partial and can be included in any template with `{{> fileName}}`.

```
emails/
  components/
    header.mjml       →  {{> header}}
    footer.mjml       →  {{> footer}}
    divider.mjml      →  {{> divider}}
    cta-button.mjml   →  {{> cta-button}}
```

### Example component (`components/header.mjml`)

```handlebars
<mj-section background-color="#4f46e5" padding="20px 32px">
  <mj-column>
    <mj-text color="#ffffff" font-size="18px" font-weight="700">
      {{brandName}}
    </mj-text>
  </mj-column>
</mj-section>
```

Components have access to all the props passed to the parent template — Handlebars partials inherit the parent context.

### Client-side registration

`useNgeTemplate()` automatically registers all components on first call — no manual setup needed.

If you need to register components separately (e.g. in a custom composable), `registerMjmlComponents()` is also auto-imported:

```ts
registerMjmlComponents()
```

### Server-side registration

On the server, the generated API route handlers automatically scan `emails/components/` and register all `.mjml` files as Handlebars partials before compiling templates. No setup needed.

### Adding new components

Drop a new `.mjml` file in `components/` and the dev server will automatically restart to pick it up.

---

## Props and the Preview UI

### Primitive props (string, number, boolean)

Appear as editable input fields in the sidebar. Changes update the preview in real time.

### Complex props (objects, arrays)

Render as **collapsible tree editors** in the sidebar:

- **Objects** — Each field is editable inline. Fields cannot be added or removed (the shape is defined by your TypeScript interface).
- **Arrays** — Items can be added or removed. New items are created by cloning the shape of existing items. Each item expands into its own editable section.

This means templates with props like `sections: ContentSection[]` or `shippingAddress: { street: string, city: string }` are fully editable from the preview UI — no JSON editing required.

### How defaults work

Defaults are extracted from your `withDefaults()` call at build time, including:
- Simple values: `title: 'Welcome!'`
- Factory functions: `sections: () => [{ heading: 'Intro', body: 'Hello' }]`
- Nested objects: `address: () => ({ street: '123 Main St', city: 'Springfield' })`

The extraction handles arrow functions, nested braces, and complex data structures automatically.

---

## Folder Structure

```
app/
  emails/
    components/         # Reusable MJML snippets (auto-registered as Handlebars partials)
      header.mjml
      footer.mjml
    welcome.vue         # Email template
    welcome.mjml        # MJML layout
    v1/
      order.vue
      order.mjml
```

The `components/` directory is reserved — it is skipped during route generation. Everything else maps to routes:

| Template file              | Preview URL                   | API endpoint                  |
|----------------------------|-------------------------------|-------------------------------|
| `emails/welcome.vue`      | `/__emails/welcome`           | `POST /api/emails/welcome`    |
| `emails/v1/order.vue`     | `/__emails/v1/order`          | `POST /api/emails/v1/order`   |

---

## Sending Emails

The generated `POST` endpoints render email HTML via MJML. To send, register a Nitro plugin that listens for the `nuxt-gen-emails:send` hook.

### Server plugin

```ts
// server/plugins/gen-emails.ts
export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('nuxt-gen-emails:send', async ({ html, data }) => {
    // data contains: { to?, from?, subject?, ...anything from sendData }
    console.log('Sending email to:', data.to)
    // Your provider logic here (SendGrid, SES, Postmark, etc.)
  })
})
```

### SendGrid example

```bash
npm install @sendgrid/mail
```

```ts
// server/plugins/gen-emails.ts
import sgMail from '@sendgrid/mail'

export default defineNitroPlugin((nitro) => {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

  nitro.hooks.hook('nuxt-gen-emails:send', async ({ html, data }) => {
    await sgMail.send({
      to: data.to as string,
      from: (data.from as string) || 'noreply@yourdomain.com',
      subject: (data.subject as string) || 'No Subject',
      html,
    })
  })
})
```

### API call

```bash
curl -X POST http://localhost:3000/api/emails/welcome \
  -H "Content-Type: application/json" \
  -d '{
    "templateData": {
      "heading": "Welcome!",
      "message": "Thanks for signing up.",
      "sections": [
        { "heading": "Next Steps", "body": "Check your dashboard." }
      ]
    },
    "sendData": {
      "to": "user@example.com",
      "subject": "Welcome aboard"
    }
  }'
```

### How it works

1. `templateData` from the request body is passed directly to the Handlebars template (no transformations)
2. MJML compiles the result into email-safe HTML
3. The `nuxt-gen-emails:send` hook is called with `{ html, data }` where `data` is `sendData`
4. The response always returns `{ success: true, html: "..." }`

If no Nitro plugin is configured, the endpoint still renders and returns the HTML — useful for testing.

---

## Module Options

| Option                 | Type      | Default    | Description                                                         |
|------------------------|-----------|------------|---------------------------------------------------------------------|
| `emailDir`             | `string`  | `'emails'` | Directory containing email templates (relative to `srcDir`)         |
| `disablePreviewInProd` | `boolean` | `true`     | When `true`, `/__emails/` preview pages are not registered in production. API routes are unaffected. |

```ts
export default defineNuxtConfig({
  nuxtGenerationEmails: {
    emailDir: 'emails',
    disablePreviewInProd: true,
  },
})
```

> Enable Nitro's OpenAPI support for auto-generated API docs:
>
> ```ts
> nitro: {
>   experimental: { openAPI: true },
> },
> ```

---

## Auto-Imports

### Client-side

| Function | Description |
|----------|-------------|
| `useNgeTemplate(name, props)` | Loads the MJML template, compiles with Handlebars, registers components, and sets the render function — no `<template>` block needed |
| `registerMjmlComponents()` | Manually registers all `.mjml` files from `components/` as Handlebars partials (called automatically by `useNgeTemplate`) |
| `encodeStoreToUrlParams(store)` | Encode a props object into URL search parameters |
| `generateShareableUrl(store)` | Generate a shareable URL with encoded props |

### Server-side

| Function | Description |
|----------|-------------|
| `encodeStoreToUrlParams(store)` | Encode a props object into URL search parameters |

---

## Securing API Endpoints

The generated endpoints are registered in all environments. Protect them in production with server middleware:

```ts
// server/middleware/protect-emails.ts
export default defineEventHandler((event) => {
  if (!event.path?.startsWith('/api/emails/')) return

  const apiKey = getHeader(event, 'x-api-key')
  if (apiKey !== process.env.EMAIL_API_KEY) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
})
```

---

## CLI Reference

| Command | Description |
|---------|-------------|
| `npx nuxt-gen-emails setup` | Scaffold the emails directory with components and an example template |
| `npx nuxt-gen-emails add <name>` | Create a new email template (`.vue` + `.mjml` pair) |

---

## Development

<details>
  <summary>Local development</summary>

  ```bash
  npm install
  npm run dev:prepare
  npm run dev

  # CLI commands
  npm run cli:setup
  npm run cli:add

  # Quality
  npm run lint
  npm run test
  ```

</details>

## License

[MIT](./LICENSE)

<!-- Badges -->
[license-src]: https://img.shields.io/npm/l/nuxt-generation-emails.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/nuxt-generation-emails

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt
[nuxt-href]: https://nuxt.com
