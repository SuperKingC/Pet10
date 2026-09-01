import { describe, expect, it } from 'vitest'
import { resolveAssetBaseUrlForPlatform } from './assetBaseUrl'

describe('asset base url resolution', () => {
  const prod = 'https://bucket.cos.ap-guangzhou.myqcloud.com/pet10-web/abc123'
  const local = 'http://127.0.0.1:8787'

  it('devtools simulator uses the local dev base when configured', () => {
    expect(resolveAssetBaseUrlForPlatform('devtools', prod, local)).toBe(local)
  })

  it('real devices always use the production base even when a dev base exists', () => {
    expect(resolveAssetBaseUrlForPlatform('ios', prod, local)).toBe(prod)
    expect(resolveAssetBaseUrlForPlatform('android', prod, local)).toBe(prod)
  })

  it('falls back to production when no dev base is configured (production builds)', () => {
    expect(resolveAssetBaseUrlForPlatform('devtools', prod, '')).toBe(prod)
  })

  it('strips trailing slashes from both bases', () => {
    expect(resolveAssetBaseUrlForPlatform('devtools', `${prod}/`, `${local}/`)).toBe(local)
    expect(resolveAssetBaseUrlForPlatform('ios', `${prod}/`, `${local}/`)).toBe(prod)
  })
})
