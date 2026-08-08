import { describe, expect, it } from 'vitest'
import {
  MAJOR_ARCANA,
  QUESTION_CATEGORIES,
  SPREADS,
  buildClosing,
  buildShareText,
  createReading,
  drawCards,
  interpretCard
} from './tarotDeck'

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
    expect(SPREADS.map((item) => item.key)).toEqual(['single', 'triple'])
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
