import { describe, expect, it } from 'vitest'
import {
  canPostMoment,
  pickMomentTopic,
  MOMENT_DAILY_MAX,
  MOMENT_MIN_GAP_MS
} from './momentRules.js'

const HOUR_MS = 60 * 60 * 1000

/** 上海时间辅助：UTC+8 */
function shanghai(year: number, month: number, day: number, hour: number): Date {
  return new Date(Date.UTC(year, month - 1, day, hour - 8))
}

describe('moment rules', () => {
  it('posts a slot moment when inside a life slot and the dice pass', () => {
    const now = shanghai(2026, 9, 1, 8) // 上海 08:00 → morning 档
    expect(pickMomentTopic({ now, petPostTimes: [], userSilenceHours: 1, random: 0.1 })).toBe('morning')
    expect(pickMomentTopic({ now, petPostTimes: [], userSilenceHours: 1, random: 0.9 })).toBeNull()
  })

  it('does not post outside life slots', () => {
    expect(pickMomentTopic({ now: shanghai(2026, 9, 1, 10), petPostTimes: [], userSilenceHours: 1, random: 0 })).toBeNull()
    expect(pickMomentTopic({ now: shanghai(2026, 9, 1, 19), petPostTimes: [], userSilenceHours: 1, random: 0 })).toBeNull()
  })

  it('covers noon afternoon and night slots', () => {
    expect(pickMomentTopic({ now: shanghai(2026, 9, 1, 12), petPostTimes: [], userSilenceHours: 1, random: 0 })).toBe('noon')
    expect(pickMomentTopic({ now: shanghai(2026, 9, 1, 16), petPostTimes: [], userSilenceHours: 1, random: 0 })).toBe('afternoon')
    expect(pickMomentTopic({ now: shanghai(2026, 9, 1, 22), petPostTimes: [], userSilenceHours: 1, random: 0 })).toBe('night')
  })

  it('does not repeat a slot already posted today', () => {
    const now = shanghai(2026, 9, 1, 9)
    const posted = [shanghai(2026, 9, 1, 8)]
    expect(pickMomentTopic({ now, petPostTimes: posted, userSilenceHours: 1, random: 0 })).toBeNull()
  })

  it('prefers the missing topic when the owner has been silent long enough', () => {
    const now = shanghai(2026, 9, 1, 19) // 非时段档，但沉默满 24h 仍发想念帖
    expect(pickMomentTopic({ now, petPostTimes: [], userSilenceHours: 30, random: 0.99 })).toBe('missing')
  })

  it('respects the daily cap and minimum gap', () => {
    const now = shanghai(2026, 9, 1, 16)
    const fourToday = Array.from({ length: MOMENT_DAILY_MAX }, (_, index) => shanghai(2026, 9, 1, 7 + index * 2))
    expect(pickMomentTopic({ now, petPostTimes: fourToday, userSilenceHours: 30, random: 0 })).toBeNull()

    const twoHoursAgo = [new Date(now.getTime() - 2 * HOUR_MS)]
    expect(pickMomentTopic({ now, petPostTimes: twoHoursAgo, userSilenceHours: 30, random: 0 })).toBeNull()

    const threeHoursAgo = [new Date(now.getTime() - MOMENT_MIN_GAP_MS)]
    expect(pickMomentTopic({ now, petPostTimes: threeHoursAgo, userSilenceHours: 30, random: 0 })).toBe('missing')
  })

  it('canPostMoment ignores yesterday posts for the daily cap', () => {
    const now = shanghai(2026, 9, 1, 8)
    const yesterdayPosts = Array.from({ length: MOMENT_DAILY_MAX + 1 }, (_, index) => shanghai(2026, 8, 31, 8 + index))
    expect(canPostMoment(yesterdayPosts, now)).toBe(true)
  })
})
