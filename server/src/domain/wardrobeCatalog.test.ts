import { describe, expect, it } from 'vitest'
import {
  WARDROBE_CATALOG,
  findWardrobeSuit,
  isWardrobeSuitKey,
  resolveWardrobeUnlock,
  type WardrobeUnlockContext
} from './wardrobeCatalog.js'

const zeroContext: WardrobeUnlockContext = {
  level: 1,
  taskClaims: 0,
  sleepCount: 0,
  codewordStreak: 0,
  matchBestStreak: 0
}

describe('wardrobe catalog', () => {
  it('keys are unique and every suit is matchable', () => {
    const keys = WARDROBE_CATALOG.map((suit) => suit.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const suit of WARDROBE_CATALOG) expect(suit.matchable).toBe(true)
  })

  it('default three suits are unlocked on day one', () => {
    const unlocked = resolveWardrobeUnlock(zeroContext).filter((item) => item.unlocked)
    expect(unlocked.map((item) => item.key)).toEqual(['default', 'scarf', 'hoodie'])
  })

  it('conditional suits unlock exactly at their thresholds', () => {
    const context = (overrides: Partial<WardrobeUnlockContext>): WardrobeUnlockContext => ({ ...zeroContext, ...overrides })
    expect(findWardrobeSuit('overalls')?.isUnlocked(context({ taskClaims: 4 }))).toBe(false)
    expect(findWardrobeSuit('overalls')?.isUnlocked(context({ taskClaims: 5 }))).toBe(true)
    expect(findWardrobeSuit('dress')?.isUnlocked(context({ codewordStreak: 2 }))).toBe(false)
    expect(findWardrobeSuit('dress')?.isUnlocked(context({ codewordStreak: 3 }))).toBe(true)
    expect(findWardrobeSuit('raincoat')?.isUnlocked(context({ level: 4 }))).toBe(false)
    expect(findWardrobeSuit('raincoat')?.isUnlocked(context({ level: 5 }))).toBe(true)
    expect(findWardrobeSuit('pajamas')?.isUnlocked(context({ sleepCount: 19 }))).toBe(false)
    expect(findWardrobeSuit('pajamas')?.isUnlocked(context({ sleepCount: 20 }))).toBe(true)
    expect(findWardrobeSuit('bag')?.isUnlocked(context({ matchBestStreak: 2 }))).toBe(false)
    expect(findWardrobeSuit('bag')?.isUnlocked(context({ matchBestStreak: 3 }))).toBe(true)
    expect(findWardrobeSuit('hat')?.isUnlocked(context({ taskClaims: 14 }))).toBe(false)
    expect(findWardrobeSuit('hat')?.isUnlocked(context({ taskClaims: 15 }))).toBe(true)
  })

  it('every non-free suit explains its condition in text', () => {
    for (const item of resolveWardrobeUnlock(zeroContext)) {
      if (item.unlocked) continue
      expect(item.conditionText.length).toBeGreaterThan(0)
    }
    expect(isWardrobeSuitKey('default')).toBe(true)
    expect(isWardrobeSuitKey('nonexistent')).toBe(false)
  })
})
