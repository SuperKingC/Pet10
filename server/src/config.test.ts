import { describe, expect, it } from 'vitest'
import { parseConfig } from './config.js'

describe('server config', () => {
  it('uses safe local development defaults', () => {
    const config = parseConfig({})
    expect(config.port).toBe(8787)
    expect(config.nodeEnv).toBe('development')
    expect(config.ai.enabled).toBe(false)
    expect(config.mail.mode).toBe('console')
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
})
