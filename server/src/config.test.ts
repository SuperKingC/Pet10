import { describe, expect, it } from 'vitest'
import { parseConfig } from './config.js'

describe('server config', () => {
  it('uses safe local development defaults', () => {
    const config = parseConfig({})
    expect(config.port).toBe(8787)
    expect(config.nodeEnv).toBe('development')
    expect(config.ai.enabled).toBe(false)
    expect(config.mail.mode).toBe('console')
    expect(config.oss.enabled).toBe(false)
  })

  it('requires production secrets', () => {
    expect(() => parseConfig({ NODE_ENV: 'production' })).toThrow(/JWT_SECRET/)
  })

  it('enables an OpenAI-compatible provider when configured', () => {
    const config = parseConfig({
      AI_API_KEY: 'secret',
      AI_BASE_URL: 'https://example.com/v1',
      AI_MODEL: 'example-model'
    })
    expect(config.ai).toEqual({
      enabled: true,
      apiKey: 'secret',
      baseUrl: 'https://example.com/v1',
      model: 'example-model'
    })
  })

  it('enables OSS only when all credentials are present', () => {
    const config = parseConfig({
      OSS_REGION: 'oss-cn-hangzhou',
      OSS_BUCKET: 'pet10',
      OSS_ACCESS_KEY_ID: 'id',
      OSS_ACCESS_KEY_SECRET: 'secret',
      OSS_PUBLIC_BASE_URL: 'https://cdn.example.com/'
    })
    expect(config.oss.enabled).toBe(true)
    expect(config.oss.publicBaseUrl).toBe('https://cdn.example.com')
  })
})
