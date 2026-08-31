import { describe, expect, it } from 'vitest'
import { resolveMatchOutcome, shouldSettleMatch } from './outfitMatchRules.js'

describe('outfit match rules', () => {
  it('settle only when two distinct users picked and not settled yet', () => {
    expect(shouldSettleMatch([], false)).toBe(false)
    expect(shouldSettleMatch([{ userId: 'a', itemId: 'scarf' }], false)).toBe(false)
    expect(shouldSettleMatch([
      { userId: 'a', itemId: 'scarf' },
      { userId: 'b', itemId: 'hoodie' }
    ], false)).toBe(true)
    // 双方齐但当天已结算 → 不再结算
    expect(shouldSettleMatch([
      { userId: 'a', itemId: 'scarf' },
      { userId: 'b', itemId: 'scarf' }
    ], true)).toBe(false)
  })

  it('matching picks raise streak and keep the best', () => {
    const outcome = resolveMatchOutcome(
      [{ userId: 'a', itemId: 'scarf' }, { userId: 'b', itemId: 'scarf' }],
      { streak: 2, bestStreak: 5 }
    )
    expect(outcome.matched).toBe(true)
    expect(outcome.matchedItemId).toBe('scarf')
    expect(outcome.nextStreak).toBe(3)
    expect(outcome.nextBestStreak).toBe(5)
  })

  it('mismatch resets streak but preserves the best', () => {
    const outcome = resolveMatchOutcome(
      [{ userId: 'a', itemId: 'scarf' }, { userId: 'b', itemId: 'hoodie' }],
      { streak: 4, bestStreak: 4 }
    )
    expect(outcome.matched).toBe(false)
    expect(outcome.matchedItemId).toBeNull()
    expect(outcome.nextStreak).toBe(0)
    expect(outcome.nextBestStreak).toBe(4)
  })
})
