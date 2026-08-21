import Taro from '@tarojs/taro'
import type { TarotReading } from './tarotReading'

const historyKey = 'pet10_tarot_history'
const historyLimit = 20

export function listTarotHistory(): TarotReading[] {
  const history = Taro.getStorageSync<TarotReading[]>(historyKey)
  return Array.isArray(history) ? history : []
}

export function saveTarotReading(reading: TarotReading): void {
  Taro.setStorageSync(historyKey, [reading, ...listTarotHistory()].slice(0, historyLimit))
}
