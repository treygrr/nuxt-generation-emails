import fs from 'node:fs'
import { join } from 'pathe'

/**
 * Scaffold an example email template that demonstrates using
 * reusable MJML components from the components/ directory.
 */
export function scaffoldExample(emailsDir: string): void {
  // ── components/brand-header.mjml ──
  fs.writeFileSync(
    join(emailsDir, 'components', 'brand-header.mjml'),
    `<!-- Component: reusable brand header -->
<mj-section background-color="#4f46e5" padding="20px 32px">
  <mj-column>
    <mj-text color="#ffffff" font-size="18px" font-weight="700" letter-spacing="-0.02em">
      {{brandName}}
    </mj-text>
  </mj-column>
</mj-section>
`,
    'utf-8',
  )

  // ── components/social-links.mjml ──
  fs.writeFileSync(
    join(emailsDir, 'components', 'social-links.mjml'),
    `<!-- Component: social media links row -->
<mj-section padding="0 32px 16px 32px">
  <mj-column>
    <mj-social font-size="12px" icon-size="24px" mode="horizontal" align="center">
      <mj-social-element name="twitter" href="https://twitter.com/example" />
      <mj-social-element name="github" href="https://github.com/example" />
      <mj-social-element name="linkedin" href="https://linkedin.com/company/example" />
    </mj-social>
  </mj-column>
</mj-section>
`,
    'utf-8',
  )

  // ── components/footer.mjml ──
  fs.writeFileSync(
    join(emailsDir, 'components', 'footer.mjml'),
    `<!-- Component: standard email footer -->
<mj-section padding="24px 32px">
  <mj-column>
    <mj-divider border-color="#e2e8f0" padding-bottom="24px" />
    <mj-text font-size="12px" color="#94a3b8" align="center" line-height="20px">
      You received this email because you are subscribed.
      <a href="#" style="color: #6366f1; text-decoration: none;">Unsubscribe</a>
    </mj-text>
  </mj-column>
</mj-section>
`,
    'utf-8',
  )

  // ── example.mjml ──
  fs.writeFileSync(
    join(emailsDir, 'example.mjml'),
    `<mjml>
  <mj-head>
    <mj-font name="DM Sans" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" />
    <mj-attributes>
      <mj-all font-family="'DM Sans', Arial, Helvetica, sans-serif" />
    </mj-attributes>
    <mj-preview>{{previewText}}</mj-preview>
  </mj-head>
  <mj-body background-color="#f4f4f5">

    <!-- Component: brand header from components/ -->
    {{> brand-header}}

    <!-- Main content -->
    <mj-section background-color="#ffffff" padding="32px">
      <mj-column>
        <mj-text font-size="24px" font-weight="600" color="#0f172a">
          {{heading}}
        </mj-text>
        <mj-text font-size="16px" line-height="28px" color="#475569" padding-top="12px">
          {{message}}
        </mj-text>
      </mj-column>
    </mj-section>

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

    <!-- Component: social links from components/ -->
    {{> social-links}}

    <!-- Component: footer from components/ -->
    {{#if showFooter}}
    {{> footer}}
    {{/if}}

  </mj-body>
</mjml>
`,
    'utf-8',
  )

  // ── example.vue ──
  const scriptClose = '<' + '/script>'

  fs.writeFileSync(
    join(emailsDir, 'example.vue'),
    `<script setup lang="ts">
defineOptions({ name: 'ExampleNge' })

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
  showFooter?: boolean
  sections?: ContentSection[]
}>(), {
  previewText: 'You have a new notification.',
  brandName: 'Acme Co',
  heading: 'Welcome!',
  message: 'This example email uses reusable MJML components from the components/ directory.',
  ctaLabel: 'Get Started',
  ctaUrl: 'https://example.com',
  showFooter: true,
  sections: () => [
    { heading: 'Brand Header', body: 'The header above comes from components/brand-header.mjml via {{> brand-header}}.' },
    { heading: 'Social Links', body: 'The social links below come from components/social-links.mjml via {{> social-links}}.' },
    { heading: 'Footer', body: 'The footer at the bottom comes from components/footer.mjml via {{> footer}}.' },
  ],
})

/**
 * useNgeTemplate auto-loads the sibling .mjml file, compiles it with
 * Handlebars, and returns a reactive ComputedRef<string> of rendered HTML.
 * MJML components from components/ are registered automatically.
 */
useNgeTemplate('example', props)
${scriptClose}
`,
    'utf-8',
  )
}
