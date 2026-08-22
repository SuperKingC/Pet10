export interface CalendarMonth {
  year: number
  month: number
  days: number
  firstWeekday: number
}

export function getCalendarMonth(date: Date): CalendarMonth {
  const year = date.getFullYear()
  const month = date.getMonth()
  return {
    year,
    month,
    days: new Date(year, month + 1, 0).getDate(),
    firstWeekday: new Date(year, month, 1).getDay(),
  }
}

export function shiftMonth(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1)
}

export function localDayKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export interface CalendarMoodEntry {
  userId: string
  day: string
  level: number
}

export interface DayMoods {
  mine?: CalendarMoodEntry
  friend?: CalendarMoodEntry
}

export function getMondayLead(date: Date): number {
  return (new Date(date.getFullYear(), date.getMonth(), 1).getDay() + 6) % 7
}

export function buildMoodByDay(moods: CalendarMoodEntry[], myUserId: string): Map<string, DayMoods> {
  const map = new Map<string, DayMoods>()
  for (const mood of moods) {
    const day = mood.day.slice(0, 10)
    const entry = map.get(day) ?? {}
    if (mood.userId === myUserId) entry.mine = mood
    else entry.friend = mood
    map.set(day, entry)
  }
  return map
}
