import { describe, expect, it } from 'vitest'
import {
  normalizeApiTemplatePath,
  resolveApiEndpointFromPreviewPath,
  toTemplatePath,
} from '../../src/runtime/utils/email-route'

describe('runtime email route helpers', () => {
  it('maps preview path to template path', () => {
    expect(toTemplatePath('/__emails/v1/order/index')).toBe('v1/order/index')
    expect(toTemplatePath('v1/order/index')).toBe('v1/order/index')
  })

  it('drops trailing /index for nested index templates without sibling route', () => {
    expect(normalizeApiTemplatePath('v1/order/index', ['v1/order/index'])).toBe('v1/order')
  })

  it('keeps trailing /index when sibling template path exists', () => {
    expect(normalizeApiTemplatePath('v1/order/index', ['v1/order', 'v1/order/index'])).toBe('v1/order/index')
  })

  it('keeps root index path unchanged', () => {
    expect(normalizeApiTemplatePath('index', ['index'])).toBe('index')
  })

  it('builds API endpoint from preview path using normalization rules', () => {
    expect(resolveApiEndpointFromPreviewPath('/__emails/v1/order/index', ['/__emails/v1/order/index'])).toBe('/api/emails/v1/order')

    expect(resolveApiEndpointFromPreviewPath('/__emails/v1/order/index', [
      '/__emails/v1/order',
      '/__emails/v1/order/index',
    ])).toBe('/api/emails/v1/order/index')

    expect(resolveApiEndpointFromPreviewPath('/__emails/index', ['/__emails/index'])).toBe('/api/emails/index')
  })
})