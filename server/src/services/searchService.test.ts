import { describe, expect, it, vi } from 'vitest'
import { createSearchService, type SearchConfig } from './searchService.js'

const config: SearchConfig = {
  enabled: true,
  apiKey: 'search-secret',
  baseUrl: 'https://api.tavily.com',
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
        results: [
          { title: 'A', url: 'https://example.com/a', content: '摘要 A', published_date: '2026-08-12' },
          { title: 'B', url: 'https://example.com/b', content: '摘要 B' },
          { title: 'C', url: 'https://example.com/c', content: '摘要 C' },
          { title: 'D', url: 'https://example.com/d', content: '摘要 D' },
          { title: 'E', url: 'https://example.com/e', content: '摘要 E' }
        ]
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
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.tavily.com/search')
    expect(fetchImpl.mock.calls[0][1]?.method).toBe('POST')
    expect(fetchImpl.mock.calls[0][1]?.headers).toMatchObject({
      Authorization: 'Bearer search-secret'
    })
    expect(JSON.parse(String(fetchImpl.mock.calls[0][1]?.body))).toMatchObject({
      query: expect.stringContaining('索尼 A7C II'),
      search_depth: 'basic',
      max_results: 4,
      include_answer: false,
      include_raw_content: false
    })
  })

  it('returns empty when the provider has no usable results', async () => {
    const service = createSearchService(config, vi.fn<typeof fetch>().mockResolvedValue(response({ results: [] })))

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
      results: [{ title: 'A', url: 'https://example.com/a', content: '摘要 A' }]
    }))
    const service = createSearchService(config, fetchImpl)

    await service.search({
      queries: ['帮 13800138000 和 me@example.com 查索尼 A7C II 价格'],
      category: 'price',
      freshnessRequired: true,
      locale: 'zh-cn'
    })

    const requestedBody = String(fetchImpl.mock.calls[0][1]?.body)
    expect(requestedBody).not.toContain('13800138000')
    expect(requestedBody).not.toContain('me@example.com')
    expect(requestedBody).toContain('A7C')
  })
})
