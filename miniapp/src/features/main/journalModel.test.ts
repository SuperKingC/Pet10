import { describe, expect, it } from 'vitest'
import { getWeekDays, groupByDay, localDayKey, resolveMoodRoomId, shiftWeek, startOfWeek, weekMonthLabel } from './journalModel'

describe('journal week strip', () => {
  it('starts the week on Monday', () => {
    const sunday = new Date(2026, 7, 23) // 周日
    const start = startOfWeek(sunday)
    expect(localDayKey(start.getFullYear(), start.getMonth(), start.getDate())).toBe('2026-08-17')
  })

  it('builds seven consecutive day keys for the anchor week', () => {
    const days = getWeekDays(new Date(2026, 7, 23))
    expect(days.map((day) => day.key)).toEqual([
      '2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20',
      '2026-08-21', '2026-08-22', '2026-08-23',
    ])
    expect(days.map((day) => day.date)).toEqual([17, 18, 19, 20, 21, 22, 23])
  })

  it('shifts by whole weeks', () => {
    const next = shiftWeek(new Date(2026, 7, 23), 1)
    expect(getWeekDays(next)[0].key).toBe('2026-08-24')
    const previous = shiftWeek(new Date(2026, 7, 23), -1)
    expect(getWeekDays(previous)[6].key).toBe('2026-08-16')
  })

  it('labels the month of the visible week', () => {
    expect(weekMonthLabel(new Date(2026, 7, 23))).toBe('2026年 8月')
  })
})

describe('group diaries by day', () => {
  it('groups entries keeping their order', () => {
    const grouped = groupByDay([
      { day: '2026-08-23', id: 'b' },
      { day: '2026-08-23', id: 'a' },
      { day: '2026-08-20', id: 'c' },
    ])
    expect(grouped.get('2026-08-23')?.map((entry) => entry.id)).toEqual(['b', 'a'])
    expect(grouped.get('2026-08-20')?.map((entry) => entry.id)).toEqual(['c'])
  })
})

describe('resolveMoodRoomId', () => {
  it('prefers the pair room and falls back to pet_dm', () => {
    expect(resolveMoodRoomId('room-pair', [{ roomId: 'room-dm', type: 'pet_dm' }])).toBe('room-pair')
    expect(resolveMoodRoomId('', [
      { roomId: 'room-dm', type: 'pet_dm' },
      { roomId: 'room-a', type: 'pair' },
    ])).toBe('room-dm')
    expect(resolveMoodRoomId('', [])).toBe('')
    expect(resolveMoodRoomId('', [{ roomId: 'room-a', type: 'pair' }])).toBe('')
  })
})
