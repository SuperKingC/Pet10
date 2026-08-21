import { describe, expect, it } from 'vitest'
import { getCalendarMonth, localDayKey, shiftMonth } from './calendarModel'

describe('miniapp calendar model', () => {
  it('calculates month metadata without timezone drift', () => {
    expect(getCalendarMonth(new Date(2026, 1, 10))).toEqual({
      year: 2026,
      month: 1,
      days: 28,
      firstWeekday: 0,
    })
    expect(localDayKey(2026, 1, 10)).toBe('2026-02-10')
  })

  it('moves across year boundaries', () => {
    const next = shiftMonth(new Date(2026, 11, 1), 1)
    expect(next.getFullYear()).toBe(2027)
    expect(next.getMonth()).toBe(0)
  })
})
