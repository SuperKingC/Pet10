import { describe, expect, it } from 'vitest'
import { MAJOR_ARCANA } from './tarotCards'
import { buildShareText, buildTarotReading, buildTarotShareTitle } from './tarotReading'

describe('miniapp tarot reading', () => {
  it('builds actionable reading content for selected cards', () => {
    const reading = buildTarotReading(' 我接下来该怎么做？ ', 'single', [{
      card: MAJOR_ARCANA[0],
      reversed: false,
      position: '核心指引',
    }], '2026-08-21T05:00:00.000Z')

    expect(reading.question).toBe('我接下来该怎么做？')
    expect(reading.cardAnalyses).toHaveLength(1)
    expect(reading.summary).toContain('愚者')
    expect(reading.next24Hours).toContain('出发')
    expect(reading.createdAt).toBe('2026-08-21T05:00:00.000Z')
    expect(buildShareText(reading)).toContain('愚者')
    // invite-friend share card title names the drawn cards
    expect(buildTarotShareTitle(reading)).toContain('愚者')
    expect(buildTarotShareTitle(reading)).toContain('想不想听听牌怎么说')
  })
})
