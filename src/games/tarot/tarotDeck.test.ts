import { describe, expect, it } from 'vitest'
import {
  MAJOR_ARCANA,
  QUESTION_CATEGORIES,
  SPREADS,
  drawCards
} from './tarotDeck'
import {
  buildClosing,
  buildProfessionalReading,
  buildShareText,
  buildSynthesis,
  createReading,
  interpretCard
} from './tarotReading'

describe('tarot deck completeness', () => {
  it('包含完整的 22 张大阿卡纳且编号唯一', () => {
    expect(MAJOR_ARCANA).toHaveLength(22)
    const ids = new Set(MAJOR_ARCANA.map((card) => card.id))
    expect(ids.size).toBe(22)
    for (let i = 0; i < 22; i += 1) expect(ids.has(i)).toBe(true)
  })

  it('每张牌都有牌名/符号/关键词/正逆位释义', () => {
    for (const card of MAJOR_ARCANA) {
      expect(card.name.length).toBeGreaterThan(0)
      expect(card.numeral.length).toBeGreaterThan(0)
      expect(card.symbol.length).toBeGreaterThan(0)
      expect(card.keywords).toHaveLength(3)
      expect(card.upright.length).toBeGreaterThan(4)
      expect(card.reversed.length).toBeGreaterThan(4)
    }
  })

  it('4 类问题与 2 种牌阵齐备', () => {
    expect(QUESTION_CATEGORIES.map((item) => item.key)).toEqual(['overall', 'love', 'study', 'pet'])
    expect(SPREADS.map((item) => item.key)).toEqual(['single', 'triple', 'relationship', 'decision'])
  })
})

describe('structured reading', () => {
  it('includes question, summary, advice and cautions', () => {
    const reading = createReading('love', 'single')
    expect(reading.question.length).toBeGreaterThan(0)
    expect(reading.summary).toContain(reading.drawn[0].card.name)
    expect(reading.advice.length).toBeGreaterThan(0)
    expect(Array.isArray(reading.cautions)).toBe(true)
  })

  it('uses spread-specific position purposes', () => {
    const relationship = drawCards('relationship')
    expect(relationship.map((item) => item.position)).toEqual(['我', '对方', '关系走向'])
    expect(interpretCard(relationship[1], 'love')).toContain('可观察到的态度')
  })

  it('synthesizes reversal balance across a spread', () => {
    const reading = createReading('overall', 'triple')
    const synthesis = buildSynthesis(reading.drawn)
    expect(synthesis.length).toBeGreaterThan(20)
    expect(reading.synthesis).toBe(synthesis)
  })
})

describe('professional ritual reading', () => {
  it('builds a category-free reading around the actual question', () => {
    const reading = buildProfessionalReading('我应该如何处理最近的合作分歧？', 'triple')
    expect(reading.question).toBe('我应该如何处理最近的合作分歧？')
    expect(reading.cardAnalyses).toHaveLength(3)
    expect(reading.next24Hours.length).toBeGreaterThan(8)
    expect(reading.next7Days.length).toBeGreaterThan(8)
    expect(reading.misreadings.length).toBeGreaterThan(0)
  })

  it('gives every card a seven-part analysis and keeps reversal descriptive', () => {
    const reading = buildProfessionalReading('我该怎样重建自己的节奏？', 'single')
    const analysis = reading.cardAnalyses[0]
    expect(analysis.positionRole.length).toBeGreaterThan(4)
    expect(analysis.symbolism.length).toBeGreaterThan(8)
    expect(analysis.orientation.length).toBeGreaterThan(8)
    expect(analysis.questionConnection).toContain(reading.question)
    expect(analysis.realWorldPattern.length).toBeGreaterThan(8)
    expect(analysis.action.length).toBeGreaterThan(8)
    expect(analysis.caution.length).toBeGreaterThan(8)
  })
})

describe('drawCards', () => {
  it('单牌抽 1 张、三牌阵抽 3 张且不重复', () => {
    const single = drawCards('single')
    expect(single).toHaveLength(1)
    const triple = drawCards('triple')
    expect(triple).toHaveLength(3)
    const ids = new Set(triple.map((item) => item.card.id))
    expect(ids.size).toBe(3)
  })

  it('三牌阵位置依次为 过去/现在/未来', () => {
    const triple = drawCards('triple')
    expect(triple.map((item) => item.position)).toEqual(['过去', '现在', '未来'])
  })

  it('正逆位标记为布尔值且落在牌库内', () => {
    for (let i = 0; i < 20; i += 1) {
      const drawn = drawCards('triple')[0]
      expect(typeof drawn.reversed).toBe('boolean')
      expect(MAJOR_ARCANA.some((card) => card.id === drawn.card.id)).toBe(true)
    }
  })
})

describe('reading texts', () => {
  it('interpretCard 包含牌名与正逆位', () => {
    const reading = createReading('overall', 'single')
    const text = interpretCard(reading.drawn[0], 'overall')
    expect(text).toContain(reading.drawn[0].card.name)
    expect(text.includes('正位') || text.includes('逆位')).toBe(true)
  })

  it('buildClosing 对同一组牌是确定的', () => {
    const reading = createReading('love', 'triple')
    expect(buildClosing(reading.drawn, 'love')).toBe(buildClosing(reading.drawn, 'love'))
  })

  it('buildShareText 生成可分享的卡片文本', () => {
    const reading = createReading('pet', 'single')
    const text = buildShareText(reading)
    expect(text).toContain('🔮')
    expect(text).toContain(reading.drawn[0].card.name)
  })
})
