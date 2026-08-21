import { describe, expect, it } from 'vitest'
import {
  MAJOR_ARCANA,
  createTarotCandidates,
  materializeDrawnCards,
  positionsForSpread,
} from './tarotCards'

describe('miniapp tarot cards', () => {
  it('contains all 22 unique major arcana cards', () => {
    expect(MAJOR_ARCANA).toHaveLength(22)
    expect(new Set(MAJOR_ARCANA.map((card) => card.id)).size).toBe(22)
  })

  it('draws unique candidates with deterministic randomness', () => {
    const values = [0.12, 0.91, 0.33, 0.72, 0.05, 0.64]
    let index = 0
    const drawn = createTarotCandidates(10, () => values[index++ % values.length])

    expect(drawn).toHaveLength(10)
    expect(new Set(drawn.map((item) => item.card.id)).size).toBe(10)
    expect(drawn.every((item) => typeof item.reversed === 'boolean')).toBe(true)
  })

  it('assigns spread positions by picked order', () => {
    const candidates = MAJOR_ARCANA.slice(0, 5).map((card) => ({
      card,
      reversed: false,
    }))

    expect(positionsForSpread('decision')).toEqual(['现状', '选项', '风险', '资源', '建议'])
    expect(materializeDrawnCards(candidates, [4, 1, 3], 'triple')).toEqual([
      { card: MAJOR_ARCANA[4], reversed: false, position: '过去' },
      { card: MAJOR_ARCANA[1], reversed: false, position: '现在' },
      { card: MAJOR_ARCANA[3], reversed: false, position: '未来' },
    ])
  })
})
