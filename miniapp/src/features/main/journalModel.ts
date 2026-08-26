export interface WeekDay {
  key: string
  date: number
}

export function localDayKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** 周一为一周起点 */
export function startOfWeek(date: Date): Date {
  const lead = (date.getDay() + 6) % 7
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - lead)
}

export function shiftWeek(date: Date, offset: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset * 7)
}

export function getWeekDays(anchor: Date): WeekDay[] {
  const start = startOfWeek(anchor)
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
    return {
      key: localDayKey(date.getFullYear(), date.getMonth(), date.getDate()),
      date: date.getDate(),
    }
  })
}

export function weekMonthLabel(anchor: Date): string {
  return `${anchor.getFullYear()}年 ${anchor.getMonth() + 1}月`
}

export function groupByDay<T extends { day: string }>(entries: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const entry of entries) {
    const day = entry.day.slice(0, 10)
    map.set(day, [...(map.get(day) ?? []), entry])
  }
  return map
}

export interface MoodRoomCandidate {
  roomId: string
  type: string
}

/** 没有好友（无双人房）时，回退到个人 pet_dm 房间 */
export function resolveMoodRoomId(pairRoomId: string, conversations: MoodRoomCandidate[]): string {
  if (pairRoomId) return pairRoomId
  return conversations.find((conversation) => conversation.type === 'pet_dm')?.roomId ?? ''
}
