import { defineNuxtModule, createResolver, addServerImports, addServerHandler, addImports, addTypeTemplate, addTemplate, extendPages } from '@nuxt/kit'
import fs from 'node:fs'
import { join, relative } from 'pathe'
import { consola } from 'consola'
import { addEmailPages } from './module-utils/add-email-pages'
import { generateServerRoutes } from './module-utils/generate-server-routes'

/** Payload passed to the `nuxt-gen-emails:send` Nitro runtime hook. */
export type NuxtGenEmailsSendData<TAdditional extends Record<string, unknown> = Record<string, unknown>> = {
  /** Recipient email address. */
  to?: string
  /** Sender email address. */
  from?: string
  /** Email subject line. */
  subject?: string
} & TAdditional

/** Payload passed to the `nuxt-gen-emails:send` Nitro runtime hook. */
export interface NuxtGenEmailsSendPayload<TSendData extends Record<string, unknown> = NuxtGenEmailsSendData> {
  /** The rendered HTML string of the email template. */
  html: string
  /** Send data forwarded from `sendData` in the request body (e.g. `to`, `subject`). */
  data: TSendData
}

// Module options TypeScript interface definition
export interface ModuleOptions {
  /** Directory containing email templates; resolved from srcDir when relative. */
  emailDir?: string
  /** When true, the `/__emails/` preview UI pages are not registered in production builds. API routes are unaffected. Defaults to `true`. */
  disablePreviewInProd?: boolean
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-generation-emails',
    configKey: 'nuxtGenerationEmails',
    compatibility: {
      // Semver version of supported nuxt versions
      nuxt: '>=4.0.0',
    },
  },
  defaults: {
    emailDir: 'emails',
    disablePreviewInProd: true,
  },
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    // Inject Nitro runtime hook type augmentation into .nuxt/types/
    // Pass both nuxt and nitro contexts so the types are visible in both client and server tsconfigs
    addTypeTemplate({
      filename: 'types/nuxt-gen-emails-nitro.d.ts',
      getContents: () => `
export interface NuxtGenEmailsSendPayload {
  html: string
  data: NuxtGenEmailsSendData
}

export type NuxtGenEmailsSendData<TAdditional extends Record<string, unknown> = Record<string, unknown>> = {
  to?: string
  from?: string
  subject?: string
} & TAdditional

export interface NuxtGenEmailsApiBody<
  TTemplateData extends Record<string, unknown> = Record<string, unknown>,
  TSendData extends Record<string, unknown> = NuxtGenEmailsSendData,
> {
  templateData: TTemplateData
  sendData: TSendData
}

declare module 'nitropack' {
  interface NitroRuntimeHooks {
    'nuxt-gen-emails:send': (payload: NuxtGenEmailsSendPayload) => void | Promise<void>
  }
}
declare module 'nitropack/types' {
  interface NitroRuntimeHooks {
    'nuxt-gen-emails:send': (payload: NuxtGenEmailsSendPayload) => void | Promise<void>
  }
}
`,
    }, { nuxt: true, nitro: true })

    // Register the emails directory in the app directory
    const configuredEmailDir = options.emailDir ?? 'emails'

    const emailsDir = join(nuxt.options.srcDir, configuredEmailDir)

    // Generate a virtual module that registers all .mjml files from components/
    // as Handlebars partials. This lets email templates call registerMjmlComponents()
    // with no arguments — the glob path is baked in at build time.
    // Uses the ~ alias (resolves to srcDir) so Vite can resolve it from .nuxt/
    const globPath = `~/${configuredEmailDir}/components/*.mjml`

    addTemplate({
      filename: 'nge/register-components.ts',
      write: true,
      getContents: () => `import Handlebars from 'handlebars'

const componentFiles: Record<string, unknown> = import.meta.glob('${globPath}', { query: '?raw', import: 'default', eager: true })

export function registerMjmlComponents(): void {
  for (const [path, source] of Object.entries(componentFiles)) {
    const name = path.split('/').pop()!.replace('.mjml', '')
    Handlebars.registerPartial(name, source as string)
  }
}
`,
    })

    // Generate a composable that loads all MJML templates via glob and provides
    // a single-call API: useNgeTemplate('name', props) → ComputedRef<string>
    const templateGlobPath = `~/${configuredEmailDir}`

    addTemplate({
      filename: 'nge/use-template.ts',
      write: true,
      getContents: () => `import { computed, h, getCurrentInstance } from 'vue'
import type { ComputedRef } from 'vue'
import mjml2html from 'mjml-browser'
import Handlebars from 'handlebars'
import { registerMjmlComponents } from './register-components'

const mjmlTemplates: Record<string, string> = import.meta.glob(
  ['${templateGlobPath}/**/*.mjml', '!${templateGlobPath}/components/**'],
  { query: '?raw', import: 'default', eager: true }
) as Record<string, string>

// Build a lookup map: 'example' | 'v1/test' | 'v1/rmi/bid' → raw MJML source
const templateMap: Record<string, string> = {}
for (const [path, source] of Object.entries(mjmlTemplates)) {
  const segments = path.split('/')
  const dirIdx = segments.lastIndexOf('${configuredEmailDir}')
  const relativeParts = dirIdx >= 0 ? segments.slice(dirIdx + 1) : [segments[segments.length - 1]]
  const name = relativeParts.join('/').replace('.mjml', '')
  templateMap[name] = source
}

let _componentsRegistered = false

/**
 * Load and render an MJML email template by name.
 * Registers MJML components (Handlebars partials) automatically on first call.
 * Sets the component's render function so no <template> block is needed.
 *
 * @param name - Template name relative to the emails directory (e.g. 'example', 'v1/test')
 * @param props - Reactive props object from defineProps
 * @returns ComputedRef<string> containing the rendered HTML
 */
export function useNgeTemplate(name: string, props: Record<string, unknown>): ComputedRef<string> {
  if (!_componentsRegistered) {
    registerMjmlComponents()
    _componentsRegistered = true
  }

  const source = templateMap[name]
  if (!source) {
    const available = Object.keys(templateMap).join(', ')
    console.error(\`[nuxt-gen-emails] Template "\${name}" not found. Available: \${available}\`)
    const fallback = computed(() => \`<pre style="color:red;">Template "\${name}" not found</pre>\`)
    const instance = getCurrentInstance()
    if (instance) instance.render = () => h('div', { innerHTML: fallback.value })
    return fallback
  }

  const compiled = Handlebars.compile(source)

  const renderedHtml = computed(() => {
    try {
      const mjmlString = compiled({ ...props })
      const result = mjml2html(mjmlString)
      return result.html
    }
    catch (e: unknown) {
      console.error(\`[\${name}] Error rendering MJML:\`, e)
      return \`<pre style="color:red;">\${e instanceof Error ? e.message : String(e)}\\n\${e instanceof Error ? e.stack : ''}</pre>\`
    }
  })

  // Set render function on the component instance so no <template> block is needed
  const instance = getCurrentInstance()
  if (instance) {
    instance.render = () => h('div', { innerHTML: renderedHtml.value })
  }

  return renderedHtml
}
`,
    })

    // Expose emails directory via runtime config (functions cannot be serialized)
    nuxt.options.runtimeConfig.nuxtGenEmails = {
      emailsDir,
    }

    // Add client auto-imports for URL params utilities
    addImports([
      {
        name: 'encodeStoreToUrlParams',
        from: resolver.resolve('./runtime/utils/url-params'),
      },
      {
        name: 'generateShareableUrl',
        from: resolver.resolve('./runtime/utils/url-params'),
      },
      {
        name: 'registerMjmlComponents',
        from: join(nuxt.options.buildDir, 'nge/register-components'),
      },
      {
        name: 'useNgeTemplate',
        from: join(nuxt.options.buildDir, 'nge/use-template'),
      },
    ])

    // Add server-side imports for URL params utilities
    addServerImports([
      {
        name: 'encodeStoreToUrlParams',
        from: resolver.resolve('./runtime/utils/url-params'),
      },
    ])

    // Register email preview pages under /__emails/
    // When disablePreviewInProd is true (default), preview pages are only
    // registered during development. API routes are always registered.
    const shouldRegisterPreview = nuxt.options.dev || !options.disablePreviewInProd

    if (shouldRegisterPreview) {
      extendPages((pages) => {
        if (!fs.existsSync(emailsDir)) {
          return
        }

        addEmailPages(emailsDir, pages, {
          emailsDir,
          buildDir: nuxt.options.buildDir,
          emailTemplateComponentPath: resolver.resolve('./runtime/pages/__emails.vue'),
        })
      })
    }

    // Generate server route handlers into the build directory and register them programmatically.
    // Props and defaults are extracted from each SFC's defineProps + withDefaults.
    const handlers = generateServerRoutes(emailsDir, nuxt.options.buildDir)

    for (const handler of handlers) {
      addServerHandler({
        route: handler.route,
        method: handler.method,
        handler: handler.handlerPath,
      })
    }

    // In dev mode, watch the emails directory for added/removed .vue files.
    if (nuxt.options.dev && fs.existsSync(emailsDir)) {
      const relDir = relative(nuxt.options.rootDir, emailsDir)
      consola.info(`[nuxt-gen-emails] Watching for new templates in ${relDir}/`)

      // Add emails directory to Nuxt's native watch list
      nuxt.options.watch.push(emailsDir + '/**/*.vue')
      nuxt.options.watch.push(emailsDir + '/**/*.mjml')

      nuxt.hook('builder:watch', (event, relativePath) => {
        const absolutePath = join(nuxt.options.rootDir, relativePath)
        const rel = relative(emailsDir, absolutePath)

        if (event === 'add' && (relativePath.endsWith('.vue') || relativePath.endsWith('.mjml'))) {
          consola.success(`[nuxt-gen-emails] New template detected: ${rel}`)
          consola.info('[nuxt-gen-emails] Restarting to register new routes...')
          nuxt.callHook('restart')
        }
        else if (event === 'unlink' && (relativePath.endsWith('.vue') || relativePath.endsWith('.mjml'))) {
          consola.warn(`[nuxt-gen-emails] Template removed: ${rel}`)
          consola.info('[nuxt-gen-emails] Restarting to update routes...')
          nuxt.callHook('restart')
        }
      })
    }
  },
})
