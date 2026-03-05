import fs from 'node:fs'
import { parse as parseSFC, compileScript } from 'vue/compiler-sfc'

/**
 * Extract the MJML template name from a Vue SFC's useNgeTemplate() call.
 *
 * Looks for `useNgeTemplate('templateName', ...)` in the <script setup> block
 * and returns the first string argument (the template name).
 *
 * @returns The template name string, or null if not found.
 */
export function extractMjmlTemplateName(filePath: string): string | null {
  const source = fs.readFileSync(filePath, 'utf-8')
  // Match useNgeTemplate('name' or useNgeTemplate("name"
  const match = source.match(/useNgeTemplate\(\s*['"]([^'"]+)['"]\s*[,)]/)
  return match ? match[1] ?? null : null
}

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
 * Parse the type parameter of `defineProps<{ ... }>()` or `defineProps<TypeName>()`
 * to extract prop names and their TypeScript types, mapping them to the simplified
 * ExtractedProp type set.
 *
 * Handles:
 *  - Inline object type: `defineProps<{ name: string; age?: number }>()`
 *  - Named type/interface: `defineProps<MyProps>()` (resolves from same script block)
 *  - Complex types: union (`string | null`), array (`string[]`), generics (`Array<string>`)
 *  - Nested object types: `{ data: { nested: string } }`
 */
function extractPropTypesFromSource(scriptContent: string): Record<string, ExtractedProp['type']> {
  const result: Record<string, ExtractedProp['type']> = {}

  // Try inline object type: defineProps<{ ... }>()
  let typeBody = extractInlineTypeBody(scriptContent)

  // If no inline type body, try resolving a named type reference
  if (!typeBody) {
    typeBody = resolveNamedTypeBody(scriptContent)
  }

  if (!typeBody) return result

  // Parse prop entries from the type body, handling complex types
  parsePropEntries(typeBody, result)

  return result
}

/**
 * Extract the type body from an inline `defineProps<{ ... }>()`.
 * Uses balanced-brace matching to handle nested object types.
 */
function extractInlineTypeBody(scriptContent: string): string | null {
  // Find defineProps< and then locate the opening brace
  const definePropsMatch = scriptContent.match(/defineProps\s*<\s*\{/)
  if (!definePropsMatch || definePropsMatch.index === undefined) return null

  const braceStart = scriptContent.indexOf('{', definePropsMatch.index + 'defineProps'.length)
  if (braceStart === -1) return null

  // Balanced-brace matching to find the closing }
  let depth = 1
  let i = braceStart + 1
  while (i < scriptContent.length && depth > 0) {
    const ch = scriptContent[i]!
    if (ch === '{') depth++
    else if (ch === '}') depth--
    if (depth > 0) i++
  }

  if (depth !== 0) return null
  return scriptContent.slice(braceStart + 1, i)
}

/**
 * Resolve a named type reference from `defineProps<TypeName>()` by finding
 * the corresponding `interface TypeName { ... }` or `type TypeName = { ... }`
 * declaration in the same script block.
 */
function resolveNamedTypeBody(scriptContent: string): string | null {
  // Match defineProps<SomeIdentifier>() — the type name is a simple identifier (no braces)
  const namedMatch = scriptContent.match(/defineProps\s*<\s*(\w+)\s*>\s*\(/)
  if (!namedMatch) return null

  const typeName = namedMatch[1] as string

  // Try interface declaration: interface TypeName { ... }
  const interfacePattern = new RegExp(`interface\\s+${typeName}\\s*\\{`)
  const interfaceMatch = interfacePattern.exec(scriptContent)
  if (interfaceMatch && interfaceMatch.index !== undefined) {
    const braceStart = scriptContent.indexOf('{', interfaceMatch.index)
    if (braceStart !== -1) {
      return extractBalancedBraceContent(scriptContent, braceStart)
    }
  }

  // Try type alias: type TypeName = { ... }
  const typeAliasPattern = new RegExp(`type\\s+${typeName}\\s*=\\s*\\{`)
  const typeAliasMatch = typeAliasPattern.exec(scriptContent)
  if (typeAliasMatch && typeAliasMatch.index !== undefined) {
    const braceStart = scriptContent.indexOf('{', typeAliasMatch.index)
    if (braceStart !== -1) {
      return extractBalancedBraceContent(scriptContent, braceStart)
    }
  }

  return null
}

/**
 * Extract content between balanced braces starting at the given position.
 * Returns the content inside the braces (excluding the outer braces).
 */
function extractBalancedBraceContent(source: string, braceStart: number): string | null {
  let depth = 1
  let i = braceStart + 1
  while (i < source.length && depth > 0) {
    const ch = source[i]!
    if (ch === '{') depth++
    else if (ch === '}') depth--
    if (depth > 0) i++
  }
  if (depth !== 0) return null
  return source.slice(braceStart + 1, i)
}

/**
 * Map a full TypeScript type string to the simplified ExtractedProp type.
 * Handles union types, array types, and generics.
 */
function classifyTsType(tsType: string): ExtractedProp['type'] {
  const trimmed = tsType.trim()

  // Union type: split by | and check each member
  if (trimmed.includes('|')) {
    const members = trimmed.split('|').map(m => m.trim()).filter(m => m !== 'null' && m !== 'undefined')
    if (members.length === 1) return classifyTsType(members[0]!)
    // If all remaining members are the same base type, return that
    const types = new Set(members.map(m => classifyTsType(m)))
    if (types.size === 1) return types.values().next().value as ExtractedProp['type']
    return 'object'
  }

  // Array types: string[], Array<string>, etc.
  if (trimmed.endsWith('[]') || /^Array\s*</.test(trimmed) || /^ReadonlyArray\s*</.test(trimmed)) {
    return 'object'
  }

  // Generic types like Record<K, V>, Map<K,V>, Set<V>, etc.
  if (/^\w+\s*</.test(trimmed)) {
    return 'object'
  }

  // Simple types
  switch (trimmed.toLowerCase()) {
    case 'string':
      return 'string'
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    default:
      return 'object'
  }
}

/**
 * Parse prop entries from a type body string (the content inside `{ ... }`).
 * Handles complex TypeScript types by using balanced-delimiter matching for
 * each property's type annotation instead of simple regex.
 */
function parsePropEntries(typeBody: string, result: Record<string, ExtractedProp['type']>): void {
  // Remove single-line and multi-line comments
  const cleaned = typeBody
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')

  let i = 0
  while (i < cleaned.length) {
    // Skip whitespace
    while (i < cleaned.length && /\s/.test(cleaned[i]!)) i++
    if (i >= cleaned.length) break

    // Try to match a property name followed by optional ? and :
    const propNameMatch = cleaned.slice(i).match(/^(\w+)\s*(\?)?\s*:/)
    if (!propNameMatch) {
      // Skip past the next ; or end of string
      const next = cleaned.indexOf(';', i)
      if (next === -1) break
      i = next + 1
      continue
    }

    const propName = propNameMatch[1] as string
    i += propNameMatch[0].length

    // Now extract the type — everything until the next unbalanced ; or end,
    // respecting nested <>, {}, [], ()
    const typeStart = i
    let depth = 0
    while (i < cleaned.length) {
      const ch = cleaned[i]!
      if (ch === '<' || ch === '{' || ch === '[' || ch === '(') {
        depth++
      }
      else if (ch === '>' || ch === '}' || ch === ']' || ch === ')') {
        if (depth > 0) depth--
        else break // unbalanced closing delimiter = end of type body
      }
      else if ((ch === ';' || ch === '\n') && depth === 0) {
        break
      }
      i++
    }

    const typeText = cleaned.slice(typeStart, i).trim()
    if (typeText) {
      result[propName] = classifyTsType(typeText)
    }

    // Skip past the delimiter
    if (i < cleaned.length && (cleaned[i] === ';' || cleaned[i] === '\n')) i++
  }
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
