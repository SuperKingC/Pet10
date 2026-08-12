import { describe, expect, it, vi } from 'vitest'
import { createSearchService, type SearchConfig } from './searchService.js'

const config: SearchConfig = {
  enabled: true,
  apiKey: 'search-secret',
  baseUrl: 'https://api.search.example',
  timeoutMs: 1000,
  maxQueries: 2,
  maxResults: 4,
  maxSnippetLength: 300,
  locale: 'zh-cn'
}

function response(body: unknown, ok = true, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  })
}

describe('SearchService', () => {
  it('normalizes provider results and limits the result count', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async () => response({
        web: {
          results: [
            { title: 'A', url: 'https://example.com/a', description: '摘要 A', age: '2 days ago' },
            { title: 'B', url: 'https://example.com/b', description: '摘要 B' },
            { title: 'C', url: 'https://example.com/c', description: '摘要 C' },
            { title: 'D', url: 'https://example.com/d', description: '摘要 D' },
            { title: 'E', url: 'https://example.com/e', description: '摘要 E' }
          ]
        }
      }))
    const service = createSearchService(config, fetchImpl)

    const result = await service.search({
      queries: ['相机价格', '索尼 A7C II'],
      category: 'price',
      freshnessRequired: true,
      locale: 'zh-cn'
    })

    expect(result.status).toBe('success')
    expect(result.results).toHaveLength(4)
    expect(result.results[0]).toMatchObject({
      title: 'A',
      url: 'https://example.com/a',
      snippet: '摘要 A',
      domain: 'example.com'
    })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(fetchImpl.mock.calls[0][0]).toContain('/res/v1/web/search')
    expect(fetchImpl.mock.calls[0][1]?.headers).toMatchObject({
      'X-Subscription-Token': 'search-secret'
    })
  })

  it('returns empty when the provider has no usable results', async () => {
    const service = createSearchService(config, vi.fn<typeof fetch>().mockResolvedValue(response({ web: { results: [] } })))

    await expect(service.search({
      queries: ['不存在的资料'],
      category: 'professional',
      freshnessRequired: true,
      locale: 'zh-cn'
    })).resolves.toMatchObject({ status: 'empty', results: [] })
  })

  it('returns unavailable when the provider request fails', async () => {
    const service = createSearchService(config, vi.fn<typeof fetch>().mockRejectedValue(new Error('network down')))

    await expect(service.search({
      queries: ['最新资料'],
      category: 'current',
      freshnessRequired: true,
      locale: 'zh-cn'
    })).resolves.toMatchObject({ status: 'unavailable', results: [] })
  })

  it('returns unavailable without calling fetch when no search key is configured', async () => {
    const fetchImpl = vi.fn<typeof fetch>()
    const service = createSearchService({ ...config, enabled: false, apiKey: undefined }, fetchImpl)

    await expect(service.search({
      queries: ['相机价格'],
      category: 'price',
      freshnessRequired: true,
      locale: 'zh-cn'
    })).resolves.toMatchObject({ status: 'unavailable', results: [] })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('uses an abort signal when the provider exceeds the timeout', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    }))
    const service = createSearchService({ ...config, timeoutMs: 10 }, fetchImpl)

    await expect(service.search({
      queries: ['相机价格'],
      category: 'price',
      freshnessRequired: true,
      locale: 'zh-cn'
    })).resolves.toMatchObject({ status: 'unavailable', results: [] })
  })

  it('removes obvious private contact details from provider queries', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async () => response({
      web: {
        results: [{ title: 'A', url: 'https://example.com/a', description: '摘要 A' }]
      }
    }))
    const service = createSearchService(config, fetchImpl)

    await service.search({
      queries: ['帮 13800138000 和 me@example.com 查索尼 A7C II 价格'],
      category: 'price',
      freshnessRequired: true,
      locale: 'zh-cn'
    })

    const requestedUrl = String(fetchImpl.mock.calls[0][0])
    expect(requestedUrl).not.toContain('13800138000')
    expect(requestedUrl).not.toContain('me%40example.com')
    expect(requestedUrl).toContain('A7C')
  })
})
