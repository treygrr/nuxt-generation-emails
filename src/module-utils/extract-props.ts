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

    // compileScript exposes the resolved props on the `__propsOptions` or via
    // the `bindings` / `__props` AST nodes.  The most reliable approach is to
    // look at the compiled result's `props` array, which is populated when
    // `defineProps` is used.

    // For type-only defineProps<{...}>(), the compiler resolves types into
    // `compiled.props` — a record keyed by prop name with `{ type, required }`.
    type PropDef = { type?: unknown, required?: boolean, default?: unknown }
    const compiledAny = compiled as unknown as { props?: Record<string, PropDef> }
    if (compiledAny.props) {
      for (const [name, propDef] of Object.entries(compiledAny.props)) {
        const propType = inferPropType(propDef.type)
        props.push({ name, type: propType })
      }
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
 * Infer a simplified type string from the Vue compiler's type constructor(s).
 */
function inferPropType(type: unknown): ExtractedProp['type'] {
  if (!type) return 'unknown'

  // type can be a constructor (String, Number) or an array of constructors
  const types = Array.isArray(type) ? type : [type]

  for (const t of types) {
    if (t === String) return 'string'
    if (t === Number) return 'number'
    if (t === Boolean) return 'boolean'
    if (t === Object || t === Array) return 'object'
  }

  return 'unknown'
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
