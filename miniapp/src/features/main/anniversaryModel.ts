export type AnniversaryRepeat = 'yearly' | 'none'

export interface AnniversaryRecord {
  id: string
  name: string
  icon: string
  note: string
  day: string
  repeatRule: AnniversaryRepeat
  createdAt: string
}

export function parseDay(day: string): Date {
  return new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)))
}

function midnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function daysBetween(from: Date, to: Date): number {
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((toUtc - fromUtc) / 86400000)
}

export function matchesDay(record: Pick<AnniversaryRecord, 'day' | 'repeatRule'>, dayKey: string): boolean {
  if (record.repeatRule === 'none') return record.day === dayKey
  return record.day.slice(5) === dayKey.slice(5)
}

function safeDate(year: number, month: number, dayNumber: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(dayNumber, lastDay))
}

export function nextOccurrence(record: Pick<AnniversaryRecord, 'day' | 'repeatRule'>, today: Date): Date | null {
  if (record.repeatRule === 'none') return parseDay(record.day)
  const month = Number(record.day.slice(5, 7)) - 1
  const dayNumber = Number(record.day.slice(8, 10))
  const candidate = safeDate(today.getFullYear(), month, dayNumber)
  if (candidate.getTime() < midnight(today).getTime()) return safeDate(today.getFullYear() + 1, month, dayNumber)
  return candidate
}

export interface AnniversaryStats {
  daysSince: number
  daysUntilNext: number
  nextAnniversaryYear: number
  isAnniversaryToday: boolean
}

export function anniversaryStats(record: AnniversaryRecord, today: Date): AnniversaryStats {
  const start = parseDay(record.day)
  const daysSince = daysBetween(start, today)
  const next = nextOccurrence(record, today) as Date
  const daysUntilNext = daysBetween(today, next)
  const isAnniversaryToday = daysUntilNext === 0 && daysSince >= 0
  const nextAnniversaryYear = Math.max(1, next.getFullYear() - start.getFullYear())
  return { daysSince, daysUntilNext, nextAnniversaryYear, isAnniversaryToday }
}

export function sortAnniversaries<T extends Pick<AnniversaryRecord, 'day' | 'repeatRule'>>(list: T[], today: Date): T[] {
  return [...list].sort((a, b) => {
    const aNext = nextOccurrence(a, today) as Date
    const bNext = nextOccurrence(b, today) as Date
    const aPast = a.repeatRule === 'none' && daysBetween(aNext, today) > 0
    const bPast = b.repeatRule === 'none' && daysBetween(bNext, today) > 0
    if (aPast !== bPast) return aPast ? 1 : -1
    if (!aPast) return daysBetween(today, aNext) - daysBetween(today, bNext)
    return daysBetween(bNext, today) - daysBetween(aNext, today)
  })
}
