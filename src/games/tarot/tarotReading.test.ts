import { describe, expect, it } from 'vitest'
import { MAJOR_ARCANA, type DrawnCard } from './tarotDeck'
import { buildProfessionalReading, buildShareText } from './tarotReading'

const cards: DrawnCard[] = [
  { card: MAJOR_ARCANA[0], reversed: false, position: '过去' },
  { card: MAJOR_ARCANA[1], reversed: true, position: '现在' },
  { card: MAJOR_ARCANA[2], reversed: false, position: '未来' }
]

describe('tarot reading', () => {
  it('builds the reading from supplied cards without drawing replacements', () => {
    const reading = buildProfessionalReading('我该如何推进当前计划？', 'triple', cards)

    expect(reading.drawn).toEqual(cards)
    expect(reading.cardAnalyses).toHaveLength(3)
    expect(reading.cardAnalyses[0].positionRole).toContain('过去')
  })

  it('builds share text from the completed reading', () => {
    const reading = buildProfessionalReading('我该如何推进当前计划？', 'triple', cards)
    const text = buildShareText(reading)

    expect(text).toContain('🔮')
    expect(text).toContain('愚者')
    expect(text).toContain('逆位')
  })
})
