import { describe, expect, it } from 'vitest'
import { buildMoodByDay, getCalendarMonth, getMondayLead, localDayKey, resolveMoodRoomId, shiftMonth } from './calendarModel'

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

describe('miniapp calendar mood room fallback', () => {
  it('keeps the pair room when it exists', () => {
    expect(resolveMoodRoomId('room-pair', [{ roomId: 'room-dm', type: 'pet_dm' }])).toBe('room-pair')
  })

  it('falls back to the personal pet_dm room without a friend', () => {
    expect(resolveMoodRoomId('', [
      { roomId: 'room-a', type: 'pair' },
      { roomId: 'room-dm', type: 'pet_dm' },
    ])).toBe('room-dm')
  })

  it('returns empty string when nothing is available', () => {
    expect(resolveMoodRoomId('', [])).toBe('')
    expect(resolveMoodRoomId('', [{ roomId: 'room-a', type: 'pair' }])).toBe('')
  })
})

describe('miniapp calendar monday lead', () => {
  it('calculates monday-first leading blanks', () => {
    // 2026-08-01 周六 → 前置 5 格
    expect(getMondayLead(new Date(2026, 7, 1))).toBe(5)
    // 2026-02-01 周日 → 前置 6 格
    expect(getMondayLead(new Date(2026, 1, 1))).toBe(6)
    // 2026-06-01 周一 → 前置 0 格
    expect(getMondayLead(new Date(2026, 5, 1))).toBe(0)
  })
})

describe('miniapp calendar mood mapping', () => {
  it('splits moods into mine and friend per day', () => {
    const moods = [
      { userId: 'me', day: '2026-08-17', level: 4 },
      { userId: 'friend', day: '2026-08-17', level: 3 },
      { userId: 'me', day: '2026-08-18', level: 2 },
    ]
    const map = buildMoodByDay(moods, 'me')
    expect(map.get('2026-08-17')?.mine?.level).toBe(4)
    expect(map.get('2026-08-17')?.friend?.level).toBe(3)
    expect(map.get('2026-08-18')?.mine?.level).toBe(2)
    expect(map.get('2026-08-18')?.friend).toBeUndefined()
  })

  it('keeps the latest entry per person per day', () => {
    const moods = [
      { userId: 'me', day: '2026-08-17T08:00:00Z', level: 2 },
      { userId: 'me', day: '2026-08-17T20:00:00Z', level: 4 },
    ]
    const map = buildMoodByDay(moods, 'me')
    expect(map.get('2026-08-17')?.mine?.level).toBe(4)
  })
})
