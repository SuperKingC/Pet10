import { describe, expect, it } from 'vitest'
import {
  BUNDLED_SUIT_KEYS,
  isBundledSuit,
  isOverlaySuit,
  matchSummary,
  OUTFIT_LAYER_STYLE,
  selectedOrDefault,
  suitAssetFiles,
  suitBadge,
  type MatchToday,
  type WardrobeItem,
  type WardrobeView
} from './wardrobeModel'

function item(overrides: Partial<WardrobeItem> = {}): WardrobeItem {
  return { key: 'scarf', name: '围巾', conditionText: '', unlocked: true, ...overrides }
}

function match(overrides: Partial<MatchToday> = {}): MatchToday {
  return { myPick: null, partnerPicked: false, matchedToday: false, streak: 0, bestStreak: 0, ...overrides }
}

describe('wardrobe model', () => {
  it('default, scarf, hat and bag ship in the bundle', () => {
    expect(BUNDLED_SUIT_KEYS).toEqual(['default', 'scarf', 'hat', 'bag'])
    expect(isBundledSuit('default')).toBe(true)
    expect(isBundledSuit('scarf')).toBe(true)
    expect(isBundledSuit('hat')).toBe(true)
    expect(isBundledSuit('bag')).toBe(true)
    expect(isBundledSuit('hoodie')).toBe(false)
  })

  it('overlay suits carry calibrated layer styles and single-file assets', () => {
    expect(isOverlaySuit('hat')).toBe(true)
    expect(isOverlaySuit('scarf')).toBe(true)
    expect(isOverlaySuit('bag')).toBe(true)
    expect(isOverlaySuit('hoodie')).toBe(false)
    for (const key of ['hat', 'scarf', 'bag'] as const) {
      const style = OUTFIT_LAYER_STYLE[key]
      expect(style).toBeDefined()
      expect(Number.parseFloat(style!.width)).toBeLessThan(100)
      expect(Number.parseFloat(style!.top)).toBeLessThan(100)
      expect(suitAssetFiles(key)).toEqual({ icon: `outfit-${key}-v1.png`, display: `outfit-${key}-v1.png` })
    }
  })

  it('body suits use separate icon and full-render files', () => {
    expect(suitAssetFiles('hoodie')).toEqual({ icon: 'hoodie-icon-v1.png', display: 'hoodie-v1.png' })
    expect(suitAssetFiles('raincoat')).toEqual({ icon: 'raincoat-icon-v1.png', display: 'raincoat-v1.png' })
  })

  it('derives path badges from condition text of locked suits', () => {
    expect(suitBadge(item({ unlocked: false, conditionText: '一起完成 5 次任务解锁' }))).toBe('任务')
    expect(suitBadge(item({ unlocked: false, conditionText: '小多利 5 级解锁' }))).toBe('等级')
    expect(suitBadge(item({ unlocked: false, conditionText: '暗号连胜 3 天解锁' }))).toBe('暗号')
    expect(suitBadge(item({ unlocked: false, conditionText: '默契换装连胜 3 天解锁' }))).toBe('默契')
    expect(suitBadge(item({ unlocked: false, conditionText: '陪小多利睡 20 次解锁' }))).toBe('睡觉')
    expect(suitBadge(item({ unlocked: true }))).toBeNull()
  })

  it('falls back to equipped when nothing selected', () => {
    const view: WardrobeView = { equipped: 'hoodie', items: [], match: match() }
    expect(selectedOrDefault(view, null)).toBe('hoodie')
    expect(selectedOrDefault(view, 'dress')).toBe('dress')
    expect(selectedOrDefault(null, null)).toBe('default')
  })

  it('summarizes match state for the day', () => {
    expect(matchSummary(match({ matchedToday: true, streak: 3 }))).toBe('今日默契达成！连胜 3 天')
    expect(matchSummary(match({ myPick: 'scarf', partnerPicked: true }))).toBe('今日已结算，明天再试试')
    expect(matchSummary(match({ myPick: 'scarf' }))).toBe('已选好啦，就等 TA 了')
    expect(matchSummary(match({ partnerPicked: true }))).toBe('TA 已选好啦，就等你了')
    expect(matchSummary(match({ streak: 2 }))).toBe('当前连胜 2 天，选一套今日装扮吧')
    expect(matchSummary(match())).toBe('各选一套当日装扮，一致即默契达成')
  })
})
