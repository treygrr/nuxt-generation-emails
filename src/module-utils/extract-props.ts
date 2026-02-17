import fs from 'node:fs'
import { parse as parseSFC, compileScript } from 'vue/compiler-sfc'

export interface ExtractedProp {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'unknown'
  default?: unknown
}

export interface ExtractedProps {
  props: ExtractedProp[]
  defaults: Record<string, unknown>
}

/**
 * Extract defineProps + withDefaults from a Vue SFC file.
 *
 * Parses the `<script setup>` block to discover prop names, inferred types,
 * and default values. This drives the preview UI fields, OpenAPI examples,
 * and URL-param handling — all from the single .vue source of truth.
 */
export function extractPropsFromSFC(filePath: string): ExtractedProps {
  const source = fs.readFileSync(filePath, 'utf-8')
  const { descriptor } = parseSFC(source, { filename: filePath })

  if (!descriptor.scriptSetup) {
    return { props: [], defaults: {} }
  }

  try {
    const compiled = compileScript(descriptor, {
      id: filePath,
      isProd: false,
    })

    const props: ExtractedProp[] = []
    const defaults: Record<string, unknown> = {}

    // The compiler's `bindings` record marks each prop with the value "props".
    // This is the most reliable indicator for type-only defineProps<{...}>().
    const propNames: string[] = []
    if (compiled.bindings) {
      for (const [name, binding] of Object.entries(compiled.bindings)) {
        if (binding === 'props') {
          propNames.push(name)
        }
      }
    }

    // Parse prop types from the defineProps<{...}>() type literal in source
    const propTypes = extractPropTypesFromSource(descriptor.scriptSetup.content)

    for (const name of propNames) {
      const type = propTypes[name] ?? 'unknown'
      props.push({ name, type })
    }

    // Extract defaults from withDefaults() by parsing the source AST.
    // The compiler stores the defaults expression range; we evaluate the
    // literal object from the source text.
    const defaultValues = extractDefaultsFromSource(descriptor.scriptSetup.content)
    for (const [name, value] of Object.entries(defaultValues)) {
      defaults[name] = value
      const existing = props.find(p => p.name === name)
      if (existing) {
        existing.default = value
      }
    }

    return { props, defaults }
  }
  catch {
    return { props: [], defaults: {} }
  }
}

/**
 * Parse the type parameter of `defineProps<{ ... }>()` to extract prop names and
 * their TypeScript types, mapping them to the simplified ExtractedProp type set.
 */
function extractPropTypesFromSource(scriptContent: string): Record<string, ExtractedProp['type']> {
  const result: Record<string, ExtractedProp['type']> = {}

  // Match the type parameter inside defineProps<{ ... }>()
  const match = scriptContent.match(/defineProps\s*<\s*\{([\s\S]*?)\}\s*>\s*\(/)
  if (!match) return result

  const typeBody = match[1] as string

  // Match lines like:  propName: string   or   propName?: number
  const propPattern = /(\w+)\s*\??\s*:\s*(\w+)/g
  let propMatch: RegExpExecArray | null

  while ((propMatch = propPattern.exec(typeBody)) !== null) {
    const name = propMatch[1] as string
    const tsType = propMatch[2] as string

    switch (tsType.toLowerCase()) {
      case 'string':
        result[name] = 'string'
        break
      case 'number':
        result[name] = 'number'
        break
      case 'boolean':
        result[name] = 'boolean'
        break
      default:
        result[name] = 'object'
        break
    }
  }

  return result
}

/**
 * Parse the `withDefaults(defineProps<…>(), { ... })` call from source text
 * and extract the defaults object literal.
 *
 * Uses a simple regex + JSON.parse approach for literal values.
 * Falls back gracefully for non-literal defaults (functions, expressions).
 */
function extractDefaultsFromSource(scriptContent: string): Record<string, unknown> {
  // Match withDefaults(defineProps<...>(), { ... })
  // We need to find the second argument to withDefaults — the defaults object.
  const withDefaultsMatch = scriptContent.match(
    /withDefaults\s*\(\s*defineProps\s*<[^>]*>\s*\(\s*\)\s*,\s*(\{[\s\S]*?\})\s*\)/,
  )

  if (!withDefaultsMatch) return {}

  const defaultsText = withDefaultsMatch[1]
  if (!defaultsText) return {}

  try {
    // Convert JS object literal to JSON-parseable string:
    // - Replace single quotes with double quotes
    // - Add quotes around unquoted keys
    // - Remove trailing commas
    const jsonish = defaultsText
      .replace(/'/g, '"') // single → double quotes
      .replace(/(\w+)\s*:/g, '"$1":') // unquoted keys → quoted
      .replace(/,\s*([\]}])/g, '$1') // trailing commas

    return JSON.parse(jsonish)
  }
  catch {
    // If JSON parse fails, fall back to line-by-line extraction for primitives
    return extractPrimitivesFromObjectLiteral(defaultsText)
  }
}

/**
 * Fallback: extract simple key: value pairs from an object literal string.
 */
function extractPrimitivesFromObjectLiteral(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  // Match lines like:  key: 'value',  or  key: 123,  or  key: true,
  const linePattern = /(\w+)\s*:\s*(?:'([^']*)'|"([^"]*)"|(\d+(?:\.\d+)?)|(true|false))\s*[,}]?/g
  let match: RegExpExecArray | null

  while ((match = linePattern.exec(text)) !== null) {
    const key = match[1] as string
    if (match[2] != null) result[key] = match[2] // single-quoted string
    else if (match[3] != null) result[key] = match[3] // double-quoted string
    else if (match[4] != null) result[key] = Number(match[4]) // number
    else if (match[5] != null) result[key] = match[5] === 'true' // boolean
  }

  return result
}
