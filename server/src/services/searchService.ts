import type { AiRouteCategory } from './aiRouting.js'

export interface SearchConfig {
  enabled: boolean
  apiKey?: string
  baseUrl: string
  timeoutMs: number
  maxQueries: number
  maxResults: number
  maxSnippetLength: number
  locale: string
}

export interface SearchInput {
  queries: string[]
  category: Exclude<AiRouteCategory, 'casual'>
  freshnessRequired: boolean
  locale: string
}

export interface SearchResult {
  title: string
  url: string
  snippet: string
  domain: string
  publishedAt?: string
}

export interface SearchResultSet {
  status: 'success' | 'empty' | 'unavailable'
  results: SearchResult[]
}

export interface SearchService {
  search(input: SearchInput): Promise<SearchResultSet>
}

interface TavilySearchResponse {
  results?: Array<{
    title?: unknown
    url?: unknown
    content?: unknown
    published_date?: unknown
  }>
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function sanitizeQuery(query: string): string {
  return query
    .replace(/\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/gi, ' ')
    .replace(/\b1[3-9]\d{9}\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function normalizeResponse(data: TavilySearchResponse, maxSnippetLength: number, maxResults: number): SearchResult[] {
  return (data.results ?? []).flatMap((candidate) => {
    const title = text(candidate.title)
    const url = text(candidate.url)
    const snippet = text(candidate.content).slice(0, maxSnippetLength)
    const domain = domainOf(url)
    if (!title || !url || !snippet || !domain) return []
    const publishedAt = text(candidate.published_date) || undefined
    return [{ title, url, snippet, domain, publishedAt }]
  }).slice(0, maxResults)
}

export function createSearchService(config: SearchConfig, fetchImpl: typeof fetch = fetch): SearchService {
  async function requestOnce(query: string, timeout: AbortSignal): Promise<SearchResult[]> {
    const response = await fetchImpl(`${config.baseUrl}/search`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        search_depth: 'basic',
        topic: 'general',
        max_results: config.maxResults,
        include_answer: false,
        include_raw_content: false,
        include_images: false,
        auto_parameters: false
      }),
      signal: timeout
    })
    if (!response.ok) throw new Error(`search_request_failed:${response.status}`)
    return normalizeResponse(
      await response.json() as TavilySearchResponse,
      config.maxSnippetLength,
      config.maxResults
    )
  }

  return {
    async search(input) {
      if (!config.enabled || !config.apiKey) return { status: 'unavailable', results: [] }
      const queries = [...new Set(input.queries.map(sanitizeQuery).filter(Boolean))].slice(0, config.maxQueries)
      if (queries.length === 0) return { status: 'empty', results: [] }

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs)
      try {
        // 每条查询独立请求并行执行；单条失败不拖垮其余查询
        const settled = await Promise.allSettled(queries.map((query) => requestOnce(query, controller.signal)))
        const merged: SearchResult[] = []
        const seenUrls = new Set<string>()
        for (const outcome of settled) {
          if (outcome.status !== 'fulfilled') continue
          for (const result of outcome.value) {
            if (seenUrls.has(result.url)) continue
            seenUrls.add(result.url)
            merged.push(result)
            if (merged.length >= config.maxResults) break
          }
          if (merged.length >= config.maxResults) break
        }
        const anySuccess = settled.some((outcome) => outcome.status === 'fulfilled')
        if (!anySuccess) return { status: 'unavailable', results: [] }
        return { status: merged.length > 0 ? 'success' : 'empty', results: merged }
      } catch {
        return { status: 'unavailable', results: [] }
      } finally {
        clearTimeout(timeout)
      }
    }
  }
}
