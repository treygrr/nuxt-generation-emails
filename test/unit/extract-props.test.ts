import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { extractPropsFromSFC } from '../../src/module-utils/extract-props'

/**
 * Helper: write a Vue SFC to a temp file and extract props from it.
 */
function extractFromSource(scriptSetupContent: string) {
  const sfc = `<script setup lang="ts">\n${scriptSetupContent}\n</script>\n<template><div /></template>\n`
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nge-test-'))
  const tmpFile = path.join(tmpDir, 'Test.vue')
  fs.writeFileSync(tmpFile, sfc, 'utf-8')
  try {
    return extractPropsFromSFC(tmpFile)
  }
  finally {
    fs.unlinkSync(tmpFile)
    fs.rmdirSync(tmpDir)
  }
}

describe('extractPropsFromSFC', () => {
  // ---- Inline object type ----

  it('parses inline defineProps<{ ... }>()', () => {
    const { props } = extractFromSource(`
      const props = defineProps<{
        name: string
        age: number
        active: boolean
      }>()
    `)
    expect(props).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'name', type: 'string' }),
        expect.objectContaining({ name: 'age', type: 'number' }),
        expect.objectContaining({ name: 'active', type: 'boolean' }),
      ]),
    )
  })

  it('parses optional props with ?', () => {
    const { props } = extractFromSource(`
      defineProps<{
        title?: string
        count?: number
      }>()
    `)
    expect(props).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'title', type: 'string' }),
        expect.objectContaining({ name: 'count', type: 'number' }),
      ]),
    )
  })

  // ---- Named type / interface ----

  it('resolves a named interface for defineProps<InterfaceName>()', () => {
    const { props } = extractFromSource(`
      interface EmailProps {
        to: string
        subject: string
        priority: number
      }

      defineProps<EmailProps>()
    `)
    expect(props).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'to', type: 'string' }),
        expect.objectContaining({ name: 'subject', type: 'string' }),
        expect.objectContaining({ name: 'priority', type: 'number' }),
      ]),
    )
  })

  it('resolves a named type alias for defineProps<TypeName>()', () => {
    const { props } = extractFromSource(`
      type MyProps = {
        label: string
        visible: boolean
      }

      defineProps<MyProps>()
    `)
    expect(props).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'label', type: 'string' }),
        expect.objectContaining({ name: 'visible', type: 'boolean' }),
      ]),
    )
  })

  // ---- Complex types ----

  it('handles union types (string | null)', () => {
    const { props } = extractFromSource(`
      defineProps<{
        name: string | null
        value: number | undefined
      }>()
    `)
    expect(props).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'name', type: 'string' }),
        expect.objectContaining({ name: 'value', type: 'number' }),
      ]),
    )
  })

  it('handles array types', () => {
    const { props } = extractFromSource(`
      defineProps<{
        items: string[]
        tags: Array<string>
      }>()
    `)
    expect(props).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'items', type: 'object' }),
        expect.objectContaining({ name: 'tags', type: 'object' }),
      ]),
    )
  })

  it('handles generic / Record types', () => {
    const { props } = extractFromSource(`
      defineProps<{
        metadata: Record<string, unknown>
        config: Map<string, number>
      }>()
    `)
    expect(props).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'metadata', type: 'object' }),
        expect.objectContaining({ name: 'config', type: 'object' }),
      ]),
    )
  })

  it('handles mixed union types as object', () => {
    const { props } = extractFromSource(`
      defineProps<{
        value: string | number
      }>()
    `)
    expect(props).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'value', type: 'object' }),
      ]),
    )
  })

  // ---- withDefaults + named type ----

  it('extracts defaults with withDefaults and a named type', () => {
    const { props, defaults } = extractFromSource(`
      interface Props {
        greeting: string
        count: number
      }

      const props = withDefaults(defineProps<Props>(), {
        greeting: 'Hello',
        count: 5,
      })
    `)
    expect(props).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'greeting', type: 'string', default: 'Hello' }),
        expect.objectContaining({ name: 'count', type: 'number', default: 5 }),
      ]),
    )
    expect(defaults).toEqual({ greeting: 'Hello', count: 5 })
  })

  // ---- Nested object types in inline defineProps ----

  it('handles nested object types', () => {
    const { props } = extractFromSource(`
      defineProps<{
        user: { name: string; age: number }
        simple: string
      }>()
    `)
    expect(props).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'user', type: 'object' }),
        expect.objectContaining({ name: 'simple', type: 'string' }),
      ]),
    )
  })

  // ---- No script setup ----

  it('returns empty for SFC without <script setup>', () => {
    const sfc = `<template><div /></template>\n`
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nge-test-'))
    const tmpFile = path.join(tmpDir, 'NoScript.vue')
    fs.writeFileSync(tmpFile, sfc, 'utf-8')
    try {
      const result = extractPropsFromSFC(tmpFile)
      expect(result.props).toEqual([])
      expect(result.defaults).toEqual({})
    }
    finally {
      fs.unlinkSync(tmpFile)
      fs.rmdirSync(tmpDir)
    }
  })

  // ---- Runtime-style defineProps (no type parameter) ----

  it('returns unknown types for runtime defineProps (no generics)', () => {
    const { props } = extractFromSource(`
      const props = defineProps({
        name: { type: String, default: 'world' },
      })
    `)
    // The compiler bindings should still identify 'name' as a prop,
    // but the source type parser won't find a type annotation.
    // Type will fall back to 'unknown'.
    for (const p of props) {
      expect(p.name).toBe('name')
      expect(['string', 'unknown']).toContain(p.type)
    }
  })

  it('resolves imported const member defaults in withDefaults', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nge-test-'))
    const defaultsFile = path.join(tmpDir, 'defaults.ts')
    const sfcFile = path.join(tmpDir, 'ImportedDefaults.vue')

    fs.writeFileSync(defaultsFile, `
export const MESSAGE_DEFAULTS = {
  previewText: 'Imported preview',
  message: 'Imported message body',
  buttonUrl: 'https://example.com/imported',
  buttonText: 'Imported CTA',
}
`, 'utf-8')

    fs.writeFileSync(sfcFile, `<script setup lang="ts">
import { MESSAGE_DEFAULTS } from './defaults'

const props = withDefaults(defineProps<{
  previewText?: string
  message?: string
  buttonUrl?: string
  buttonText?: string
}>(), {
  previewText: MESSAGE_DEFAULTS.previewText,
  message: MESSAGE_DEFAULTS.message,
  buttonUrl: MESSAGE_DEFAULTS.buttonUrl,
  buttonText: MESSAGE_DEFAULTS.buttonText,
})
</script>
<template><div /></template>
`, 'utf-8')

    try {
      const { defaults, props } = extractPropsFromSFC(sfcFile)
      expect(defaults).toEqual({
        previewText: 'Imported preview',
        message: 'Imported message body',
        buttonUrl: 'https://example.com/imported',
        buttonText: 'Imported CTA',
      })

      expect(props).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'previewText', default: 'Imported preview' }),
          expect.objectContaining({ name: 'message', default: 'Imported message body' }),
          expect.objectContaining({ name: 'buttonUrl', default: 'https://example.com/imported' }),
          expect.objectContaining({ name: 'buttonText', default: 'Imported CTA' }),
        ]),
      )
    }
    finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })
})
