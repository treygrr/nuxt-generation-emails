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
  const propPattern = /(\w+)\s*(?:\?\s*)?:\s*(\w+)/g
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
 * Uses balanced-delimiter matching to correctly handle nested structures
 * (arrays, objects) and arrow-function factory defaults.
 */
function extractDefaultsFromSource(scriptContent: string): Record<string, unknown> {
  const defaultsText = extractDefaultsObjectText(scriptContent)
  if (!defaultsText) return {}

  try {
    // Evaluate the defaults object as a JS expression.
    // Arrow-function factories like `() => [...]` are called to get actual values.
    // eslint-disable-next-line no-new-func
    const fn = new Function(`
      const _defaults = (${defaultsText});
      const _result = {};
      for (const [k, v] of Object.entries(_defaults)) {
        _result[k] = typeof v === 'function' ? v() : v;
      }
      return _result;
    `)
    return fn() as Record<string, unknown>
  }
  catch {
    // Fall back to line-by-line extraction for primitives
    return extractPrimitivesFromObjectLiteral(defaultsText)
  }
}

/**
 * Extract the defaults object text from `withDefaults(defineProps<...>(), { ... })`
 * using balanced delimiter matching to correctly handle nested structures.
 */
function extractDefaultsObjectText(scriptContent: string): string | null {
  const wdIdx = scriptContent.indexOf('withDefaults(')
  if (wdIdx === -1) return null

  // Start after the '(' of withDefaults(
  const start = scriptContent.indexOf('(', wdIdx + 'withDefaults'.length)
  if (start === -1) return null

  let depth = 1
  let i = start + 1
  let separatorComma = -1

  while (i < scriptContent.length && depth > 0) {
    const ch = scriptContent[i]!

    // Skip string literals
    if (ch === '\'' || ch === '"') {
      const quote = ch
      i++
      while (i < scriptContent.length) {
        if (scriptContent[i] === '\\') { i += 2; continue }
        if (scriptContent[i] === quote) break
        i++
      }
      i++
      continue
    }

    // Skip template literals
    if (ch === '`') {
      i++
      while (i < scriptContent.length) {
        if (scriptContent[i] === '\\') { i += 2; continue }
        if (scriptContent[i] === '`') break
        if (scriptContent[i] === '$' && scriptContent[i + 1] === '{') {
          i += 2
          let tdepth = 1
          while (i < scriptContent.length && tdepth > 0) {
            if (scriptContent[i] === '{') tdepth++
            else if (scriptContent[i] === '}') tdepth--
            if (tdepth > 0) i++
          }
        }
        i++
      }
      i++
      continue
    }

    // Skip line comments
    if (ch === '/' && scriptContent[i + 1] === '/') {
      i = scriptContent.indexOf('\n', i)
      if (i === -1) break
      i++
      continue
    }

    // Skip block comments
    if (ch === '/' && scriptContent[i + 1] === '*') {
      i = scriptContent.indexOf('*/', i) + 2
      if (i < 2) break
      continue
    }

    if (ch === '(' || ch === '{' || ch === '[') {
      depth++
    }
    else if (ch === ')' || ch === '}' || ch === ']') {
      depth--
      if (depth === 0) break // closing ) of withDefaults(...)
    }
    else if (ch === ',' && depth === 1 && separatorComma === -1) {
      separatorComma = i
    }

    i++
  }

  if (separatorComma === -1) return null

  const secondArg = scriptContent.slice(separatorComma + 1, i).trim()
  return secondArg || null
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
