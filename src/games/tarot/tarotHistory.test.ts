import { beforeEach, describe, expect, it } from 'vitest'
import { MAJOR_ARCANA } from './tarotDeck'
import { listReadingHistory, saveReading } from './tarotHistory'
import type { TarotReading } from './tarotReading'

function reading(createdAt: string): TarotReading {
  return {
    question: '测试问题',
    category: 'overall',
    spread: 'single',
    drawn: [{ card: MAJOR_ARCANA[0], reversed: false, position: '指引' }],
    cardTexts: ['解读'],
    summary: '总结',
    synthesis: '综合',
    advice: ['建议'],
    cautions: ['提醒'],
    closing: '结语',
    cardAnalyses: [],
    next24Hours: '今天',
    next7Days: '本周',
    misreadings: [],
    createdAt
  }
}

describe('tarot history', () => {
  beforeEach(() => window.localStorage.clear())

  it('returns an empty history when stored JSON is malformed', () => {
    window.localStorage.setItem('pet10_tarot_history', '{broken')
    expect(listReadingHistory()).toEqual([])
  })

  it('stores newest readings first and keeps at most twenty entries', () => {
    for (let index = 0; index < 22; index += 1) {
      saveReading(reading(`2026-08-10T00:${String(index).padStart(2, '0')}:00.000Z`))
    }

    const history = listReadingHistory()
    expect(history).toHaveLength(20)
    expect(history[0].createdAt).toBe('2026-08-10T00:21:00.000Z')
    expect(history.at(-1)?.createdAt).toBe('2026-08-10T00:02:00.000Z')
  })
})
