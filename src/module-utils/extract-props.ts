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
    const defaultValues = extractDefaults(compiled.scriptSetupAst, descriptor.scriptSetup.content)
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

type AstNode = {
  type: string
  [key: string]: unknown
}

function asAstNode(value: unknown): AstNode | null {
  if (!value || typeof value !== 'object') return null
  const node = value as Record<string, unknown>
  if (typeof node.type !== 'string') return null
  return node as AstNode
}

function extractDefaults(scriptSetupAst: unknown[] | undefined, scriptContent: string): Record<string, unknown> {
  const astDefaults = extractDefaultsFromAst(scriptSetupAst)
  if (astDefaults) return astDefaults
  return extractDefaultsFromSource(scriptContent)
}

function extractDefaultsFromAst(scriptSetupAst: unknown[] | undefined): Record<string, unknown> | null {
  if (!Array.isArray(scriptSetupAst)) return null

  for (const root of scriptSetupAst) {
    const rootNode = asAstNode(root)
    if (!rootNode) continue
    const found = findWithDefaultsSecondArg(rootNode)
    if (!found) continue

    try {
      const evaluated = evaluateAstExpression(found)
      if (evaluated && typeof evaluated === 'object' && !Array.isArray(evaluated)) {
        return evaluated as Record<string, unknown>
      }
    }
    catch (error) {
      debugLog('Failed AST-based withDefaults extraction; falling back to source parser', error)
    }
  }

  return null
}

function findWithDefaultsSecondArg(node: AstNode): AstNode | null {
  if (node.type === 'CallExpression') {
    const callee = asAstNode(node.callee)
    if (callee?.type === 'Identifier' && callee.name === 'withDefaults') {
      const args = Array.isArray(node.arguments) ? node.arguments : []
      const secondArg = asAstNode(args[1])
      if (secondArg) return secondArg
    }
  }

  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const child = asAstNode(item)
        if (!child) continue
        const found = findWithDefaultsSecondArg(child)
        if (found) return found
      }
      continue
    }

    const child = asAstNode(value)
    if (!child) continue
    const found = findWithDefaultsSecondArg(child)
    if (found) return found
  }

  return null
}

function evaluateAstExpression(node: AstNode): unknown {
  switch (node.type) {
    case 'ObjectExpression': {
      const result: Record<string, unknown> = {}
      const properties = Array.isArray(node.properties) ? node.properties : []
      for (const propLike of properties) {
        const prop = asAstNode(propLike)
        if (!prop) continue
        if (prop.type !== 'ObjectProperty') continue

        const keyNode = asAstNode(prop.key)
        const key = keyNode?.type === 'Identifier'
          ? String(keyNode.name)
          : keyNode?.type === 'StringLiteral'
            ? String(keyNode.value)
            : null

        if (!key) continue

        const valueNode = asAstNode(prop.value)
        if (!valueNode) continue
        result[key] = evaluateAstExpression(valueNode)
      }
      return result
    }

    case 'ArrayExpression': {
      const elements = Array.isArray(node.elements) ? node.elements : []
      return elements
        .map(element => asAstNode(element))
        .filter((element): element is AstNode => !!element)
        .map(element => evaluateAstExpression(element))
    }

    case 'StringLiteral':
      return node.value as string

    case 'NumericLiteral':
      return node.value as number

    case 'BooleanLiteral':
      return node.value as boolean

    case 'NullLiteral':
      return null

    case 'TemplateLiteral': {
      const expressions = Array.isArray(node.expressions) ? node.expressions : []
      if (expressions.length > 0) {
        throw new Error('Unsupported TemplateLiteral with expressions in defaults')
      }
      const quasis = Array.isArray(node.quasis) ? node.quasis : []
      return quasis
        .map((quasi) => {
          const quasiNode = asAstNode(quasi)
          const cooked = quasiNode?.value && typeof quasiNode.value === 'object'
            ? (quasiNode.value as Record<string, unknown>).cooked
            : undefined
          return typeof cooked === 'string' ? cooked : ''
        })
        .join('')
    }

    case 'ArrowFunctionExpression': {
      const body = asAstNode(node.body)
      if (!body) return undefined
      if (body.type === 'BlockStatement') {
        const statements = Array.isArray(body.body) ? body.body : []
        const returnStmt = statements
          .map(stmt => asAstNode(stmt))
          .find(stmt => stmt?.type === 'ReturnStatement')
        const arg = returnStmt ? asAstNode(returnStmt.argument) : null
        return arg ? evaluateAstExpression(arg) : undefined
      }
      return evaluateAstExpression(body)
    }

    case 'ParenthesizedExpression': {
      const expr = asAstNode(node.expression)
      return expr ? evaluateAstExpression(expr) : undefined
    }

    case 'TSAsExpression': {
      const expr = asAstNode(node.expression)
      return expr ? evaluateAstExpression(expr) : undefined
    }

    case 'Identifier': {
      if (node.name === 'undefined') return undefined
      throw new Error(`Unsupported identifier in defaults: ${String(node.name)}`)
    }

    default:
      throw new Error(`Unsupported AST node in defaults: ${node.type}`)
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
