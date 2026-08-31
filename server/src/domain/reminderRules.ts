export interface ParsedReminder {
  content: string
  scheduleType: 'once' | 'daily' | 'weekly'
  nextRunAt: Date
  weekday?: number
}

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000
const WEEKDAYS: Record<string, number> = {
  日: 0, 天: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6
}

function shanghaiParts(date: Date) {
  const local = new Date(date.getTime() + SHANGHAI_OFFSET_MS)
  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth(),
    day: local.getUTCDate(),
    weekday: local.getUTCDay()
  }
}

function toUtc(year: number, month: number, day: number, hour: number, minute = 0) {
  return new Date(Date.UTC(year, month, day, hour - 8, minute))
}

function parseHour(text: string): { hour: number; minute: number } | null {
  const match = text.match(/(凌晨|早上|上午|中午|下午|晚上)?\s*(\d{1,2})\s*点(?:\s*(\d{1,2})\s*分?)?/)
  if (!match) return null
  let hour = Number(match[2])
  const minute = Number(match[3] ?? 0)
  const period = match[1]
  if ((period === '下午' || period === '晚上') && hour < 12) hour += 12
  if (period === '中午' && hour < 11) hour += 12
  if (period === '凌晨' && hour === 12) hour = 0
  if (hour > 23 || minute > 59) return null
  return { hour, minute }
}

function reminderContent(text: string) {
  return text.replace(/^.*?提醒我/, '').trim().replace(/[。！!]+$/, '')
}

export function parseReminderRequest(text: string, now = new Date()): ParsedReminder | null {
  if (!text.includes('提醒我')) return null
  const content = reminderContent(text)
  if (!content) return null

  const relative = text.match(/(\d+)\s*(分钟|小时)后提醒我/)
  if (relative) {
    const amount = Number(relative[1])
    const unitMs = relative[2] === '小时' ? 60 * 60 * 1000 : 60 * 1000
    return { content, scheduleType: 'once', nextRunAt: new Date(now.getTime() + amount * unitMs) }
  }

  const time = parseHour(text)
  if (!time) return null
  const parts = shanghaiParts(now)

  if (text.includes('明天')) {
    return {
      content,
      scheduleType: 'once',
      nextRunAt: toUtc(parts.year, parts.month, parts.day + 1, time.hour, time.minute)
    }
  }

  if (text.includes('每天')) {
    let nextRunAt = toUtc(parts.year, parts.month, parts.day, time.hour, time.minute)
    if (nextRunAt <= now) nextRunAt = toUtc(parts.year, parts.month, parts.day + 1, time.hour, time.minute)
    return { content, scheduleType: 'daily', nextRunAt }
  }

  const weekly = text.match(/每周([一二三四五六日天])/)
  if (weekly) {
    const weekday = WEEKDAYS[weekly[1]]
    let daysAhead = (weekday - parts.weekday + 7) % 7
    let nextRunAt = toUtc(parts.year, parts.month, parts.day + daysAhead, time.hour, time.minute)
    if (nextRunAt <= now) {
      daysAhead += 7
      nextRunAt = toUtc(parts.year, parts.month, parts.day + daysAhead, time.hour, time.minute)
    }
    return { content, scheduleType: 'weekly', weekday, nextRunAt }
  }

  return null
}

/** 取消意图：话里带「提醒」并出现取消类措辞（确定性规则，宁可漏判不误伤正常设置） */
export function parseReminderCancel(text: string): boolean {
  if (!text.includes('提醒')) return false
  return /取消|撤掉|不要了|别提醒/.test(text)
}
