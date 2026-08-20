import { describe, expect, it } from 'vitest'
import { parseConfig } from './config.js'

describe('server config', () => {
  it('uses safe local development defaults', () => {
    const config = parseConfig({})
    expect(config.port).toBe(8787)
    expect(config.nodeEnv).toBe('development')
    expect(config.ai.enabled).toBe(false)
    expect(config.mail.mode).toBe('console')
    expect(config.allowedEmails).toEqual([])
    expect(config.oss.enabled).toBe(false)
    expect(config.search).toEqual({
      enabled: false,
      apiKey: undefined,
      baseUrl: 'https://api.tavily.com',
      timeoutMs: 8000,
      maxQueries: 2,
      maxResults: 6,
      maxSnippetLength: 500,
      locale: 'zh-cn'
    })
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

  it('treats an empty optional OSS URL as unset', () => {
    const config = parseConfig({
      OSS_PUBLIC_BASE_URL: ''
    })

    expect(config.oss.enabled).toBe(false)
    expect(config.oss.publicBaseUrl).toBeUndefined()
  })

  it('normalizes the login email allowlist', () => {
    const config = parseConfig({
      ALLOWED_EMAILS: ' First@Example.com,second@example.com, first@example.com '
    })

    expect(config.allowedEmails).toEqual(['first@example.com', 'second@example.com'])
  })

  it('enables WeChat authentication when both credentials are configured', () => {
    const config = parseConfig({
      WECHAT_APP_ID: 'wx-app-id',
      WECHAT_APP_SECRET: 'wx-app-secret'
    })

    expect(config.wechat).toEqual({
      enabled: true,
      appId: 'wx-app-id',
      appSecret: 'wx-app-secret'
    })
  })

  it('enables web search when configured', () => {
    const config = parseConfig({
      SEARCH_API_KEY: 'search-secret',
      SEARCH_BASE_URL: 'https://api.tavily.com/',
      SEARCH_TIMEOUT_MS: '5000',
      SEARCH_MAX_QUERIES: '3',
      SEARCH_MAX_RESULTS: '8',
      SEARCH_MAX_SNIPPET_LENGTH: '400',
      SEARCH_LOCALE: 'zh-cn'
    })

    expect(config.search).toEqual({
      enabled: true,
      apiKey: 'search-secret',
      baseUrl: 'https://api.tavily.com',
      timeoutMs: 5000,
      maxQueries: 3,
      maxResults: 8,
      maxSnippetLength: 400,
      locale: 'zh-cn'
    })
  })
})
