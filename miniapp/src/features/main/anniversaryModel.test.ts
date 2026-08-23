import { describe, expect, it } from 'vitest'
import { anniversaryStats, matchesDay, nextOccurrence, sortAnniversaries, statsLines } from './anniversaryModel'

const yearly = { id: '1', name: '恋爱纪念日', icon: 'heart', note: '', day: '2025-02-14', repeatRule: 'yearly' as const, createdAt: '' }
const once = { id: '2', name: '演唱会', icon: 'star', note: '', day: '2026-10-01', repeatRule: 'none' as const, createdAt: '' }

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

describe('statsLines', () => {
  it('yearly shows elapsed days plus countdown', () => {
    expect(statsLines(yearly, new Date(2026, 7, 23))).toEqual(['已经走过 555 天', '距第 2 周年还有 175 天'])
  })
  it('yearly celebrates today', () => {
    expect(statsLines(yearly, new Date(2026, 1, 14))[1]).toContain('周年')
  })
  it('one-off future shows countdown only', () => {
    expect(statsLines(once, new Date(2026, 7, 23))).toEqual(['还有 39 天'])
  })
  it('one-off past shows elapsed days', () => {
    const past = { ...once, day: '2026-08-01' }
    expect(statsLines(past, new Date(2026, 7, 23))).toEqual(['已经过去 22 天'])
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
