import type { TarotReading } from './tarotReading'

const HISTORY_KEY = 'pet10_tarot_history'
const HISTORY_LIMIT = 20

export function listReadingHistory(): TarotReading[] {
  try {
    const history = JSON.parse(window.localStorage.getItem(HISTORY_KEY) ?? '[]') as unknown
    return Array.isArray(history) ? history as TarotReading[] : []
  } catch {
    return []
  }
}

export function saveReading(reading: TarotReading): void {
  const history = [reading, ...listReadingHistory()].slice(0, HISTORY_LIMIT)
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}
