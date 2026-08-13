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
  return {
    async search(input) {
      if (!config.enabled || !config.apiKey) return { status: 'unavailable', results: [] }
      const queries = [...new Set(input.queries.map(sanitizeQuery).filter(Boolean))].slice(0, config.maxQueries)
      if (queries.length === 0) return { status: 'empty', results: [] }

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs)
      try {
        const response = await fetchImpl(`${config.baseUrl}/search`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: queries.join('；'),
            search_depth: 'basic',
            topic: 'general',
            max_results: config.maxResults,
            include_answer: false,
            include_raw_content: false,
            include_images: false,
            auto_parameters: false
          }),
          signal: controller.signal
        })
        if (!response.ok) throw new Error(`search_request_failed:${response.status}`)
        const results = normalizeResponse(
          await response.json() as TavilySearchResponse,
          config.maxSnippetLength,
          config.maxResults
        )
        return { status: results.length > 0 ? 'success' : 'empty', results }
      } catch {
        return { status: 'unavailable', results: [] }
      } finally {
        clearTimeout(timeout)
      }
    }
  }
}
