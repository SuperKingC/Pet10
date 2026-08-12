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

interface BraveSearchResponse {
  web?: {
    results?: Array<{
      title?: unknown
      url?: unknown
      description?: unknown
      age?: unknown
      page_age?: unknown
    }>
  }
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

function normalizeResponse(data: BraveSearchResponse, maxSnippetLength: number): SearchResult[] {
  return (data.web?.results ?? []).flatMap((candidate) => {
    const title = text(candidate.title)
    const url = text(candidate.url)
    const snippet = text(candidate.description).slice(0, maxSnippetLength)
    const domain = domainOf(url)
    if (!title || !url || !snippet || !domain) return []
    const publishedAt = text(candidate.page_age) || text(candidate.age) || undefined
    return [{ title, url, snippet, domain, publishedAt }]
  })
}

export function createSearchService(config: SearchConfig, fetchImpl: typeof fetch = fetch): SearchService {
  async function searchQuery(query: string, locale: string): Promise<SearchResult[]> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs)
    try {
      const url = new URL('/res/v1/web/search', config.baseUrl)
      url.searchParams.set('q', query)
      url.searchParams.set('count', String(Math.min(config.maxResults, 20)))
      url.searchParams.set('search_lang', locale.startsWith('zh') ? 'zh-hans' : locale.split('-')[0])
      url.searchParams.set('safesearch', 'moderate')
      const response = await fetchImpl(url.toString(), {
        headers: {
          Accept: 'application/json',
          'X-Subscription-Token': config.apiKey ?? ''
        },
        signal: controller.signal
      })
      if (!response.ok) throw new Error(`search_request_failed:${response.status}`)
      return normalizeResponse(await response.json() as BraveSearchResponse, config.maxSnippetLength)
    } finally {
      clearTimeout(timeout)
    }
  }

  return {
    async search(input) {
      if (!config.enabled || !config.apiKey) return { status: 'unavailable', results: [] }
      const queries = [...new Set(input.queries.map(sanitizeQuery).filter(Boolean))].slice(0, config.maxQueries)
      if (queries.length === 0) return { status: 'empty', results: [] }
      try {
        const batches = await Promise.all(queries.map(query => searchQuery(query, input.locale || config.locale)))
        const unique = new Map<string, SearchResult>()
        for (const result of batches.flat()) {
          if (!unique.has(result.url)) unique.set(result.url, result)
          if (unique.size >= config.maxResults) break
        }
        const results = [...unique.values()]
        return { status: results.length > 0 ? 'success' : 'empty', results }
      } catch {
        return { status: 'unavailable', results: [] }
      }
    }
  }
}
