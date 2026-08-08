import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { Fortune } from '../domain/types'
import { FortuneDetail } from './FortuneDetail'

const fortune: Fortune = {
  id: 'fortune-1',
  userId: 'user-1',
  day: '2026-08-08',
  content: {
    schemaVersion: 2,
    zodiac: '狮子座',
    theme: '先整理自己的节奏，再回应外界的变化',
    overall: { rating: 4, summary: '适合稳步推进手上的安排，清晰的节奏会带来好结果。', text: '综合运势完整正文。'.repeat(20) },
    love: { rating: 3, single: '单身状态完整正文。'.repeat(12), partnered: '有伴状态完整正文。'.repeat(12) },
    study: { rating: 4, text: '学习运势完整正文。'.repeat(12) },
    work: { rating: 4, text: '工作运势完整正文。'.repeat(12) },
    wealth: { rating: 2, text: '财运完整正文。'.repeat(12) },
    health: { rating: 5, text: '健康完整正文。'.repeat(12) },
    luckyColor: { name: '雾霾蓝', hex: '#7892A8' },
    luckyNumber: 8,
    luckyPhrase: '把注意力放回能由自己决定的事情上。'
  }
}

describe('fortune detail', () => {
  it('renders the complete editorial horoscope', () => {
    const markup = renderToStaticMarkup(<FortuneDetail fortune={fortune} onClose={vi.fn()} />)

    for (const label of ['今日运势', '今日主题', '综合运势', '感情运势', '单身', '有伴', '学习运势', '工作运势', '财运', '健康', '幸运色', '幸运数字', '今日好运句']) {
      expect(markup).toContain(label)
    }
    expect(markup).toContain('单身状态完整正文')
    expect(markup).toContain('有伴状态完整正文')
    expect(markup).toContain('雾霾蓝')
    expect(markup).not.toContain('<details')
    expect(markup).not.toContain('AI')
    expect(markup).not.toContain('宠物')
  })
})
