import { defineCommand } from 'citty'
import { join } from 'pathe'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { consola } from 'consola'
import { loadNuxtConfig } from '@nuxt/kit'

async function findEmailsDir(): Promise<string> {
  const cwd = process.cwd()

  try {
    const config = await loadNuxtConfig({ cwd })
    const srcDir = config.srcDir || cwd
    return join(srcDir, 'emails')
  }
  catch {
    if (existsSync(join(cwd, 'app'))) {
      return join(cwd, 'app', 'emails')
    }
    if (existsSync(join(cwd, 'src'))) {
      return join(cwd, 'src', 'emails')
    }
    return join(cwd, 'emails')
  }
}

function writeIfMissing(filePath: string, content: string, label: string): void {
  if (existsSync(filePath)) {
    consola.info(`  Skipped (exists): ${label}`)
    return
  }
  writeFileSync(filePath, content, 'utf-8')
  consola.success(`  Created: ${label}`)
}

// ---------------------------------------------------------------------------
// Example MJML components — reusable snippets in components/
// ---------------------------------------------------------------------------

const COMPONENT_HEADER = `<mj-section background-color="#4f46e5" padding="20px 32px">
  <mj-column>
    <mj-text color="#ffffff" font-size="18px" font-weight="700" letter-spacing="-0.02em">
      {{brandName}}
    </mj-text>
  </mj-column>
</mj-section>
`

const COMPONENT_DIVIDER = `<mj-section padding="0 32px">
  <mj-column>
    <mj-divider border-color="#e2e8f0" padding="16px 0" />
  </mj-column>
</mj-section>
`

const COMPONENT_FOOTER = `<mj-section padding="24px 32px">
  <mj-column>
    <mj-text font-size="12px" color="#94a3b8" align="center" line-height="20px">
      You received this email from {{brandName}}.<br />
      <a href="{{unsubscribeUrl}}" style="color: #6366f1; text-decoration: none;">Unsubscribe</a>
    </mj-text>
  </mj-column>
</mj-section>
`

// ---------------------------------------------------------------------------
// Example email template that uses all three partial types
// ---------------------------------------------------------------------------

function exampleMjml(): string {
  return `<mjml>
  <mj-head>
    <mj-font name="DM Sans" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" />
    <mj-attributes>
      <mj-all font-family="'DM Sans', Arial, Helvetica, sans-serif" />
    </mj-attributes>
    <mj-preview>{{previewText}}</mj-preview>
  </mj-head>
  <mj-body background-color="#f4f4f5">

    {{!-- Component: header --}}
    {{> header}}

    <!-- Main content -->
    <mj-section background-color="#ffffff" padding="32px">
      <mj-column>
        <mj-text font-size="22px" font-weight="600" color="#0f172a">
          {{heading}}
        </mj-text>
        <mj-text font-size="15px" line-height="26px" color="#475569" padding-top="12px">
          {{message}}
        </mj-text>
      </mj-column>
    </mj-section>

    {{!-- Component: divider --}}
    {{> divider}}

    <!-- Dynamic sections -->
    {{#each sections}}
    <mj-section background-color="#ffffff" padding="8px 32px">
      <mj-column border="1px solid #e2e8f0" border-radius="6px" padding="16px">
        <mj-text font-size="16px" font-weight="600" color="#0f172a">
          {{this.heading}}
        </mj-text>
        <mj-text font-size="14px" color="#475569" padding-top="4px">
          {{this.body}}
        </mj-text>
      </mj-column>
    </mj-section>
    {{/each}}

    <!-- CTA -->
    <mj-section background-color="#ffffff" padding="24px 32px">
      <mj-column>
        <mj-button href="{{ctaUrl}}" background-color="#4f46e5" border-radius="6px" font-size="14px" font-weight="600" inner-padding="12px 24px">
          {{ctaLabel}}
        </mj-button>
      </mj-column>
    </mj-section>

    {{!-- Component: footer --}}
    {{> footer}}

  </mj-body>
</mjml>
`
}

function exampleVue(): string {
  const scriptClose = '<' + '/script>'
  const templateOpen = '<' + 'template>'
  const templateClose = '<' + '/template>'
  const bt = '`' // backtick — avoids escaping issues in the outer template literal
  const ds = '$' // dollar sign

  return `<script setup lang="ts">
import { computed } from 'vue'
import mjml2html from 'mjml-browser'
import Handlebars from 'handlebars'
import mjmlSource from './example.mjml?raw'

defineOptions({ name: 'ExampleNge' })

registerMjmlComponents()

interface ContentSection {
  heading: string
  body: string
}

const props = withDefaults(defineProps<{
  previewText?: string
  brandName?: string
  heading?: string
  message?: string
  ctaLabel?: string
  ctaUrl?: string
  unsubscribeUrl?: string
  sections?: ContentSection[]
}>(), {
  previewText: 'You have a new message.',
  brandName: 'My Brand',
  heading: 'Welcome!',
  message: 'This example email uses reusable components (header, divider, footer) from the components/ directory. Edit the props and templates to make it your own.',
  ctaLabel: 'Get Started',
  ctaUrl: 'https://example.com',
  unsubscribeUrl: 'https://example.com/unsubscribe',
  sections: () => [
    { heading: 'Header', body: 'The header above comes from components/header.mjml — use {{> header}} to include it.' },
    { heading: 'Divider', body: 'The divider between sections comes from components/divider.mjml — use {{> divider}} to include it.' },
    { heading: 'Footer', body: 'The footer below comes from components/footer.mjml — use {{> footer}} to include it.' },
  ],
})

const compiledTemplate = Handlebars.compile(mjmlSource)

const renderedHtml = computed(() => {
  try {
    const mjmlString = compiledTemplate({ ...props })
    const result = mjml2html(mjmlString)
    return result.html
  }
  catch (e: unknown) {
    console.error('[example.vue] Error rendering MJML:', e)
    return ${bt}<pre style="color:red;">${ds}{e instanceof Error ? e.message : String(e)}\\n${ds}{e instanceof Error ? e.stack : ''}</pre>${bt}
  }
})
${scriptClose}

${templateOpen}
  <div v-html="renderedHtml" />
${templateClose}
`
}

export default defineCommand({
  meta: {
    name: 'setup',
    description: 'Scaffold the emails directory with example templates and partials',
  },
  async run() {
    const emailsDir = await findEmailsDir()

    consola.info('')
    consola.info('Setting up nuxt-generation-emails...')
    consola.info('')

    // Create directory structure
    const dirs = [
      emailsDir,
      join(emailsDir, 'components'),
    ]

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
    }

    consola.success('Directory structure:')
    consola.info('  emails/')
    consola.info('  └─ components/   (reusable MJML snippets registered as Handlebars partials)')
    consola.info('')

    // Write components
    consola.success('Components:')
    writeIfMissing(join(emailsDir, 'components', 'header.mjml'), COMPONENT_HEADER, 'components/header.mjml')
    writeIfMissing(join(emailsDir, 'components', 'divider.mjml'), COMPONENT_DIVIDER, 'components/divider.mjml')
    writeIfMissing(join(emailsDir, 'components', 'footer.mjml'), COMPONENT_FOOTER, 'components/footer.mjml')
    consola.info('')

    // Write example email
    consola.success('Example email:')
    writeIfMissing(join(emailsDir, 'example.mjml'), exampleMjml(), 'example.mjml')
    writeIfMissing(join(emailsDir, 'example.vue'), exampleVue(), 'example.vue')
    consola.info('')

    consola.success('Setup complete! Run your dev server and visit /__emails/example to preview.')
    consola.info('')
  },
})
