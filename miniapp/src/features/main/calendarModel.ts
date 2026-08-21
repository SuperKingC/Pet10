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
