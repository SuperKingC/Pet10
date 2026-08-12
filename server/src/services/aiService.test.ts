import { describe, expect, it, vi } from 'vitest'
import type { Pet } from '../domain/models.js'
import { createAiService } from './aiService.js'
import type { SearchService } from './searchService.js'

const pet: Pet = {
  id: 'pet-1',
  relationshipId: 'relationship-1',
  roomId: 'room-1',
  name: '小多利',
  level: 1,
  experience: 0,
  experienceToNextLevel: 100,
  hunger: 80,
  mood: 80,
  energy: 80,
  health: 100,
  intimacy: 30,
  updatedAt: new Date('2026-08-12T08:00:00.000Z')
}

const config = {
  enabled: true,
  apiKey: 'ai-secret',
  baseUrl: 'https://ai.example/v1',
  model: 'test-model'
}

function createFetchReply(content: string) {
  return vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
    choices: [{ message: { content } }]
  }), {
    headers: { 'content-type': 'application/json' }
  }))
}

function createSearch(status: 'success' | 'empty' | 'unavailable' = 'success'): SearchService {
  return {
    search: vi.fn(async () => ({
      status,
      results: status === 'success'
        ? [{ title: '价格资料', url: 'https://example.com/price', snippet: '索尼 A7C II 单机身约 12000 元。', domain: 'example.com' }]
        : []
    }))
  }
}

function replyInput(text: string) {
  return {
    messages: [{
      id: 'message-1',
      roomId: 'room-1',
      senderId: 'user-1',
      senderType: 'user' as const,
      kind: 'text' as const,
      text,
      createdAt: new Date('2026-08-12T08:00:00.000Z')
    }],
    memories: [],
    pet
  }
}

describe('AiService intelligent replies', () => {
  it('does not search for casual conversation', async () => {
    const search = createSearch()
    const fetchImpl = createFetchReply('我陪你休息一会儿。')
    const ai = createAiService(config, { search, fetchImpl })

    await expect(ai.reply(replyInput('我今天有点累'))).resolves.toBe('我陪你休息一会儿。')
    expect(search.search).not.toHaveBeenCalled()
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('returns one clarification without searching for vague price questions', async () => {
    const search = createSearch()
    const fetchImpl = createFetchReply('不应该调用')
    const ai = createAiService(config, { search, fetchImpl })

    await expect(ai.reply(replyInput('一个相机多少钱？'))).resolves.toContain('品牌')
    expect(search.search).not.toHaveBeenCalled()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('searches current price questions and gives the research to the answer model', async () => {
    const search = createSearch()
    const fetchImpl = createFetchReply('索尼 A7C II 单机身目前大约 1.2 万元，促销时会有波动。')
    const ai = createAiService(config, { search, fetchImpl })

    await expect(ai.reply(replyInput('索尼 A7C II 全新单机身现在多少钱？'))).resolves.toContain('1.2 万元')
    expect(search.search).toHaveBeenCalledWith(expect.objectContaining({
      category: 'price',
      freshnessRequired: true
    }))
    expect(fetchImpl.mock.calls[0][1]?.body).toContain('价格资料')
    expect(fetchImpl.mock.calls[0][1]?.body).not.toContain('https://example.com/price')
  })

  it('does not call the answer model or invent facts when search has no usable evidence', async () => {
    const search = createSearch('empty')
    const fetchImpl = createFetchReply('不应该调用')
    const ai = createAiService(config, { search, fetchImpl })

    await expect(ai.reply(replyInput('蛋仔派对碰碰棋 S2 赛季主流阵容详情'))).resolves.toContain('暂时没查到')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('logs search metadata without logging the user question or evidence text', async () => {
    const search = createSearch()
    const logSearch = vi.fn()
    const ai = createAiService(config, {
      search,
      fetchImpl: createFetchReply('整理后的价格回答'),
      logSearch
    })

    await ai.reply(replyInput('帮 13800138000 查索尼 A7C II 多少钱'))

    expect(logSearch).toHaveBeenCalledWith(expect.objectContaining({
      category: 'price',
      status: 'success',
      resultCount: 1,
      durationMs: expect.any(Number)
    }))
    expect(JSON.stringify(logSearch.mock.calls)).not.toContain('13800138000')
    expect(JSON.stringify(logSearch.mock.calls)).not.toContain('索尼 A7C II')
    expect(JSON.stringify(logSearch.mock.calls)).not.toContain('12000')
  })

  it('injects at most fifteen prioritized memories into the answer prompt', async () => {
    const fetchImpl = createFetchReply('回答')
    const ai = createAiService(config, { search: createSearch(), fetchImpl })
    const memories = Array.from({ length: 20 }, (_, index) => ({
      id: `memory-${index}`,
      roomId: 'room-1',
      text: `MEMORY_${String(index).padStart(2, '0')}`,
      sourceMessageId: undefined,
      canMention: true,
      category: 'other' as const,
      importance: 1 as const,
      source: 'inferred' as const,
      createdAt: new Date(2026, 7, 12, 0, index),
      updatedAt: new Date(2026, 7, 12, 0, index)
    }))

    await ai.reply({ ...replyInput('普通问题'), memories })

    const body = String(fetchImpl.mock.calls[0][1]?.body)
    expect(body).toContain('MEMORY_19')
    expect(body).toContain('MEMORY_05')
    expect(body).not.toContain('MEMORY_04')
  })
})
