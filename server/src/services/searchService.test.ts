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
  it('issues one parallel request per query and merges results up to the cap', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { query: string }
      const suffix = body.query.includes('评测') ? '-b' : ''
      return response({
        results: [
          { title: `A${suffix}`, url: `https://example.com/a${suffix}`, content: `摘要 A${suffix}`, published_date: '2026-08-12' },
          { title: `B${suffix}`, url: `https://example.com/b${suffix}`, content: `摘要 B${suffix}` },
          { title: `C${suffix}`, url: `https://example.com/c${suffix}`, content: `摘要 C${suffix}` }
        ]
      })
    })
    const service = createSearchService(config, fetchImpl)

    const result = await service.search({
      queries: ['相机价格 当前价格 全新 中国', '相机价格 评测 优缺点 对比'],
      category: 'price',
      freshnessRequired: true,
      locale: 'zh-cn'
    })

    expect(result.status).toBe('success')
    expect(result.results).toHaveLength(4)
    expect(result.results[0]).toMatchObject({ title: 'A', url: 'https://example.com/a', domain: 'example.com' })
    expect(result.results[3]).toMatchObject({ title: 'A-b', url: 'https://example.com/a-b' })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    const firstInit = fetchImpl.mock.calls[0][1]
    expect(firstInit?.method).toBe('POST')
    expect(firstInit?.headers).toMatchObject({ Authorization: 'Bearer search-secret' })
    expect(JSON.parse(String(firstInit?.body))).toMatchObject({
      query: '相机价格 当前价格 全新 中国',
      search_depth: 'basic',
      max_results: 4,
      include_answer: false,
      include_raw_content: false
    })
  })

  it('deduplicates identical provider urls across queries', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response({
      results: [
        { title: 'A', url: 'https://example.com/a', content: '摘要 A' },
        { title: 'B', url: 'https://example.com/b', content: '摘要 B' }
      ]
    }))
    const service = createSearchService(config, fetchImpl)

    const result = await service.search({
      queries: ['同一问题 视角一', '同一问题 视角二'],
      category: 'professional',
      freshnessRequired: true,
      locale: 'zh-cn'
    })

    expect(result.status).toBe('success')
    expect(result.results.map((item) => item.url)).toEqual(['https://example.com/a', 'https://example.com/b'])
  })

  it('keeps results from the query that succeeded when another one fails', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { query: string }
      if (body.query.includes('失败')) throw new Error('network down')
      return response({ results: [{ title: 'A', url: 'https://example.com/a', content: '摘要 A' }] })
    })
    const service = createSearchService(config, fetchImpl)

    await expect(service.search({
      queries: ['正常查询', '会失败的查询'],
      category: 'current',
      freshnessRequired: true,
      locale: 'zh-cn'
    })).resolves.toMatchObject({ status: 'success', results: [{ url: 'https://example.com/a' }] })
  })

  it('reports unavailable when every per-query request fails', async () => {
    const service = createSearchService(config, vi.fn<typeof fetch>().mockRejectedValue(new Error('network down')))

    await expect(service.search({
      queries: ['最新资料', '最新资料 补充'],
      category: 'current',
      freshnessRequired: true,
      locale: 'zh-cn'
    })).resolves.toMatchObject({ status: 'unavailable', results: [] })
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
