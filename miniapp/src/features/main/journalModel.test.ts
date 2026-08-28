import { describe, expect, it } from 'vitest'
import { getWeekDays, groupByDay, JOURNAL_MOODS, journalDateLabel, journalDisplayPhotos, journalMoodDisplay, localDayKey, parseJournalMoodTitle, resolveMoodRoomId, shiftWeek, startOfWeek, weekMonthLabel } from './journalModel'

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
    expect(weekMonthLabel(new Date(2026, 7, 23))).toBe('2026年8月')
  })

  it('formats the diary date line used on the editor page', () => {
    expect(journalDateLabel('2026-08-26')).toBe('8月26日 星期三')
  })

  it('orders the mood picker from sad to excited', () => {
    expect(JOURNAL_MOODS.map((mood) => mood.id)).toEqual(['sad', 'calm', 'happy', 'excited'])
  })

  it('formats and parses the editor mood line used on the diary card', () => {
    expect(journalMoodDisplay('happy', 'sunny')).toBe('开心 ☀️')
    expect(parseJournalMoodTitle('开心 ☀️')).toEqual({ moodId: 'happy', weatherId: 'sunny', isMoodTitle: true })
    expect(parseJournalMoodTitle('难过 🌧️')).toEqual({ moodId: 'sad', weatherId: 'rain', isMoodTitle: true })
    expect(parseJournalMoodTitle('阳光正好的一天')).toEqual({ moodId: 'happy', weatherId: 'sunny', isMoodTitle: false })
  })
})

describe('journal display photos', () => {
  it('uses the default puppy photo until the player uploads one', () => {
    expect(journalDisplayPhotos([], 'default.png')).toEqual({ src: 'default.png', isDefault: true })
    expect(journalDisplayPhotos(['wxfile://mine.jpg'], 'default.png')).toEqual({ src: 'wxfile://mine.jpg', isDefault: false })
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
