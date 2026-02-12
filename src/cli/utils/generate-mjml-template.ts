export function generateMjmlTemplate(emailName: string): string {
  const capitalizedEmailName = emailName.charAt(0).toUpperCase() + emailName.slice(1)

  return `<mjml>
  <mj-head>
    <mj-font name="DM Sans" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" />
    <mj-attributes>
      <mj-all font-family="'DM Sans', Arial, Helvetica, sans-serif" />
    </mj-attributes>
    <mj-preview>{{previewText}}</mj-preview>
  </mj-head>
  <mj-body background-color="#f4f4f5">

    <!-- Header -->
    <mj-section background-color="#ffffff" padding="32px 32px 0 32px">
      <mj-column>
        <mj-text font-size="12px" font-weight="600" text-transform="uppercase" letter-spacing="0.05em" color="#6366f1">
          ${capitalizedEmailName}
        </mj-text>
        <mj-text font-size="24px" font-weight="600" color="#0f172a" padding-top="16px">
          {{heading}}
        </mj-text>
        <mj-text font-size="16px" line-height="28px" color="#475569">
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
        <mj-button href="{{ctaUrl}}" background-color="#6366f1" border-radius="6px" font-size="14px" font-weight="600" inner-padding="12px 24px">
          {{ctaLabel}}
        </mj-button>
      </mj-column>
    </mj-section>

    <!-- Footer (conditional) -->
    {{#if showFooter}}
    <mj-section padding="24px 32px 32px 32px">
      <mj-column>
        <mj-text font-size="12px" color="#94a3b8" align="center">
          You received this email because you are subscribed. <a href="#" style="color: #6366f1;">Unsubscribe</a>
        </mj-text>
      </mj-column>
    </mj-section>
    {{/if}}

  </mj-body>
</mjml>
`
}
