import { describe, expect, it } from 'vitest'
import { codewordStreakFromFlags, dayBefore } from './codewordStreak.js'

describe('codeword streak', () => {
  it('counts consecutive both-answered days from today backwards', () => {
    expect(codewordStreakFromFlags([])).toBe(0)
    expect(codewordStreakFromFlags([true, true, true])).toBe(3)
    // 今天还没答上 → 连胜中断为 0
    expect(codewordStreakFromFlags([false, true, true])).toBe(0)
  })

  it('walks back calendar days in UTC', () => {
    expect(dayBefore('2026-03-01', 1)).toBe('2026-02-28')
    expect(dayBefore('2026-08-31', 7)).toBe('2026-08-24')
    expect(dayBefore('2026-01-01', 1)).toBe('2025-12-31')
  })
})
