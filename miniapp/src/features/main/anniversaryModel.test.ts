import { describe, expect, it } from 'vitest'
import { anniversaryPhotoBoxHeight, anniversaryStats, matchesDay, nextOccurrence, sortAnniversaries } from './anniversaryModel'

const yearly = { id: '1', name: '恋爱纪念日', icon: 'heart', note: '', day: '2025-02-14', repeatRule: 'yearly' as const, createdAt: '' }
const once = { id: '2', name: '演唱会', icon: 'star', note: '', day: '2026-10-01', repeatRule: 'none' as const, createdAt: '' }

describe('anniversaryPhotoBoxHeight', () => {
  it('scales the photo box with the real aspect ratio', () => {
    // 1:1 恰好压在上限，左右只剩发丝级暖底边
    expect(anniversaryPhotoBoxHeight(1)).toBe(640)
    expect(anniversaryPhotoBoxHeight(3 / 4)).toBe(491)
    expect(anniversaryPhotoBoxHeight(9 / 16)).toBe(368)
  })
  it('clamps extreme ratios so photos stay fully visible without huge cards', () => {
    expect(anniversaryPhotoBoxHeight(16 / 9)).toBe(640)
    expect(anniversaryPhotoBoxHeight(1 / 20)).toBe(360)
  })
  it('falls back to the default box for unknown or invalid aspects', () => {
    expect(anniversaryPhotoBoxHeight(undefined)).toBe(420)
    expect(anniversaryPhotoBoxHeight(0)).toBe(420)
    expect(anniversaryPhotoBoxHeight(-2)).toBe(420)
    expect(anniversaryPhotoBoxHeight(Number.NaN)).toBe(420)
    expect(anniversaryPhotoBoxHeight(Number.POSITIVE_INFINITY)).toBe(420)
  })
})

describe('matchesDay', () => {
  it('yearly matches month-day in any year', () => {
    expect(matchesDay(yearly, '2026-02-14')).toBe(true)
    expect(matchesDay(yearly, '2026-02-15')).toBe(false)
  })
  it('none matches exact day only', () => {
    expect(matchesDay(once, '2026-10-01')).toBe(true)
    expect(matchesDay(once, '2027-10-01')).toBe(false)
  })
})

describe('nextOccurrence', () => {
  it('yearly rolls to next year after passing', () => {
    expect(nextOccurrence(yearly, new Date(2026, 7, 23))?.getFullYear()).toBe(2027)
  })
  it('yearly keeps this year before the date', () => {
    expect(nextOccurrence(yearly, new Date(2026, 0, 1))?.getFullYear()).toBe(2026)
  })
  it('leap day falls back to Feb 28 in non-leap years', () => {
    const leap = { ...yearly, day: '2024-02-29' }
    const next = nextOccurrence(leap, new Date(2026, 6, 1))
    expect(next?.getMonth()).toBe(1)
    expect(next?.getDate()).toBe(28)
  })
})

describe('anniversaryStats', () => {
  it('counts days since and countdown to next year', () => {
    const stats = anniversaryStats(yearly, new Date(2026, 7, 23))
    expect(stats.daysSince).toBe(555)
    expect(stats.daysUntilNext).toBe(175)
    expect(stats.nextAnniversaryYear).toBe(2)
    expect(stats.isAnniversaryToday).toBe(false)
  })
  it('flags the anniversary day itself', () => {
    const stats = anniversaryStats(yearly, new Date(2026, 1, 14))
    expect(stats.isAnniversaryToday).toBe(true)
    expect(stats.nextAnniversaryYear).toBe(1)
  })
  it('handles yearly before the first date', () => {
    const future = { ...yearly, day: '2026-09-01' }
    const stats = anniversaryStats(future, new Date(2026, 7, 23))
    expect(stats.daysSince).toBeLessThan(0)
    expect(stats.daysUntilNext).toBe(9)
  })
})

describe('sortAnniversaries', () => {
  it('sorts upcoming first by closeness, past one-off last', () => {
    const past = { ...once, id: 'past', day: '2026-01-01' }
    const near = { ...once, id: 'near', day: '2026-09-01' }
    const far = { ...yearly, id: 'far' }
    const sorted = sortAnniversaries([past, far, near], new Date(2026, 7, 23))
    expect(sorted.map((item) => item.id)).toEqual(['near', 'far', 'past'])
  })
})
