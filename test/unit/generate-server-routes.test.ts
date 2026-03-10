import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { generateServerRoutes } from '../../src/module-utils/generate-server-routes'

function writeEmailTemplatePair(emailsDir: string, templatePath: string): void {
  const vuePath = path.join(emailsDir, `${templatePath}.vue`)
  const mjmlPath = path.join(emailsDir, `${templatePath}.mjml`)

  fs.mkdirSync(path.dirname(vuePath), { recursive: true })

  fs.writeFileSync(vuePath, `<script setup lang="ts">
const props = withDefaults(defineProps<{
  subject?: string
}>(), {
  subject: 'Subject line',
})

useNgeTemplate('${templatePath}', props)
</script>
<template><div /></template>
`, 'utf-8')

  fs.writeFileSync(mjmlPath, `<mjml>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text>{{subject}}</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
`, 'utf-8')
}

describe('generateServerRoutes', () => {
  const tempRoots: string[] = []

  afterEach(() => {
    for (const tempRoot of tempRoots) {
      fs.rmSync(tempRoot, { recursive: true, force: true })
    }
    tempRoots.length = 0
  })

  function createTempDirs() {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nge-routes-'))
    tempRoots.push(tempRoot)

    const emailsDir = path.join(tempRoot, 'emails')
    const buildDir = path.join(tempRoot, '.nuxt')
    fs.mkdirSync(emailsDir, { recursive: true })
    fs.mkdirSync(buildDir, { recursive: true })

    return { emailsDir, buildDir }
  }

  it('drops trailing /index for nested index.vue API routes', () => {
    const { emailsDir, buildDir } = createTempDirs()

    writeEmailTemplatePair(emailsDir, 'v1/notifications/sample/index')

    const handlers = generateServerRoutes(emailsDir, buildDir)

    expect(handlers.some(h => h.route === '/api/emails/v1/notifications/sample')).toBe(true)
    expect(handlers.some(h => h.route === '/api/emails/v1/notifications/sample/index')).toBe(false)
  })

  it('keeps current behavior for non-index templates', () => {
    const { emailsDir, buildDir } = createTempDirs()

    writeEmailTemplatePair(emailsDir, 'v1/notifications/sample/receipt')

    const handlers = generateServerRoutes(emailsDir, buildDir)

    expect(handlers.some(h => h.route === '/api/emails/v1/notifications/sample/receipt')).toBe(true)
  })

  it('keeps root index.vue mapped to /index', () => {
    const { emailsDir, buildDir } = createTempDirs()

    writeEmailTemplatePair(emailsDir, 'index')

    const handlers = generateServerRoutes(emailsDir, buildDir)

    expect(handlers.some(h => h.route === '/api/emails/index')).toBe(true)
  })

  it('keeps /index when sibling template route would collide', () => {
    const { emailsDir, buildDir } = createTempDirs()

    writeEmailTemplatePair(emailsDir, 'v1/notifications/sample')
    writeEmailTemplatePair(emailsDir, 'v1/notifications/sample/index')

    const handlers = generateServerRoutes(emailsDir, buildDir)

    expect(handlers.some(h => h.route === '/api/emails/v1/notifications/sample')).toBe(true)
    expect(handlers.some(h => h.route === '/api/emails/v1/notifications/sample/index')).toBe(true)
    expect(handlers.filter(h => h.route === '/api/emails/v1/notifications/sample')).toHaveLength(1)
    expect(handlers.filter(h => h.route === '/api/emails/v1/notifications/sample/index')).toHaveLength(1)
  })
})
