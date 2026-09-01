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

const CN_NUM: Record<string, number> = {
  一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9
}

/** 中文数量词解析：支持阿拉伯数字、一~九/两、十/十五/二十、半 */
function parseCnAmount(token: string): number | null {
  if (/^\d+$/.test(token)) return Number(token)
  if (token === '半') return 0.5
  if (token === '十') return 10
  const tensMatch = token.match(/^([一二两三四五六七八九])?十([一二三四五六七八九])?$/)
  if (tensMatch) {
    const tens = (tensMatch[1] ? CN_NUM[tensMatch[1]] : 1) * 10
    const ones = tensMatch[2] ? CN_NUM[tensMatch[2]] : 0
    return tens + ones
  }
  return CN_NUM[token] ?? null
}

export function parseReminderRequest(text: string, now = new Date()): ParsedReminder | null {
  if (!text.includes('提醒我')) return null
  const contentBase = reminderContent(text)
  if (!contentBase) return null

  // 相对时间：一分钟后 / 3小时之后 / 半小时后提醒我（时间短语在「提醒我」前后都支持）
  const relative = text.match(/([0-9一二两三四五六七八九十半]+)\s*个?\s*(分钟|小时)\s*(?:之|以)?后/)
  if (relative) {
    const amount = parseCnAmount(relative[1])
    if (amount && amount > 0) {
      const unitMs = relative[2] === '小时' ? 60 * 60 * 1000 : 60 * 1000
      const content = contentBase.split(relative[0]).join('').replace(/^[，,、_\-\s]+/, '').trim()
      if (!content) return null
      return { content, scheduleType: 'once', nextRunAt: new Date(now.getTime() + Math.round(amount * unitMs)) }
    }
  }

  const time = parseHour(text)
  if (!time) return null
  const parts = shanghaiParts(now)

  if (text.includes('明天')) {
    return {
      content: contentBase,
      scheduleType: 'once',
      nextRunAt: toUtc(parts.year, parts.month, parts.day + 1, time.hour, time.minute)
    }
  }

  if (text.includes('每天')) {
    let nextRunAt = toUtc(parts.year, parts.month, parts.day, time.hour, time.minute)
    if (nextRunAt <= now) nextRunAt = toUtc(parts.year, parts.month, parts.day + 1, time.hour, time.minute)
    return { content: contentBase, scheduleType: 'daily', nextRunAt }
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
    return { content: contentBase, scheduleType: 'weekly', weekday, nextRunAt }
  }

  return null
}

/** 取消意图：话里带「提醒」并出现取消类措辞（确定性规则，宁可漏判不误伤正常设置） */
export function parseReminderCancel(text: string): boolean {
  if (!text.includes('提醒')) return false
  return /取消|撤掉|不要了|别提醒/.test(text)
}
