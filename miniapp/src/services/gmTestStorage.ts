import Taro from '@tarojs/taro'
import { EMPTY_OUTFIT, type OutfitPieces, type SuitKey } from '../domain/wardrobeModel'

/** GM 本地测试模式的本地持久化：开关 + 本地穿戴（与真实服务端数据完全隔离） */

const testModeKey = 'pet10_gm_test_mode'
const testOutfitKey = 'pet10_gm_test_outfit'

export function readGmTestMode(): boolean {
  // getStorageSync 无值返回空串：必须判类型，'' 是 falsy 恰好当关闭
  return Taro.getStorageSync(testModeKey) === true
}

export function writeGmTestMode(enabled: boolean) {
  Taro.setStorageSync(testModeKey, enabled)
}

const OUTFIT_SLOTS = ['hat', 'scarf', 'bag'] as const

function isSuitKey(value: unknown): value is SuitKey {
  return typeof value === 'string' && value.length > 0 && value.length <= 30
}

export function readTestOutfit(): OutfitPieces {
  const raw = Taro.getStorageSync<Partial<OutfitPieces>>(testOutfitKey)
  if (!raw || typeof raw !== 'object') return EMPTY_OUTFIT
  const pieces: OutfitPieces = { ...EMPTY_OUTFIT }
  if (isSuitKey(raw.body)) pieces.body = raw.body
  for (const slot of OUTFIT_SLOTS) {
    const value = raw[slot]
    pieces[slot] = isSuitKey(value) ? value : null
  }
  return pieces
}

export function writeTestOutfit(pieces: OutfitPieces) {
  Taro.setStorageSync(testOutfitKey, pieces)
}
