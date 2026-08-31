/** 默契换装的纯判定：双方都选后结算，一致连胜+1，不一致清零但保留历史最高。 */

export interface OutfitMatchPick {
  userId: string
  itemId: string
}

export interface OutfitMatchOutcome {
  settled: boolean
  matched: boolean
  /** matched 时为一致的套装 key */
  matchedItemId: string | null
  nextStreak: number
  nextBestStreak: number
}

export function shouldSettleMatch(picks: OutfitMatchPick[], alreadySettledToday: boolean): boolean {
  if (alreadySettledToday) return false
  if (picks.length < 2) return false
  const userIds = new Set(picks.map((pick) => pick.userId))
  return userIds.size === 2
}

export function resolveMatchOutcome(
  picks: OutfitMatchPick[],
  previous: { streak: number; bestStreak: number }
): OutfitMatchOutcome {
  const matched = picks.length >= 2 && picks[0].itemId === picks[1].itemId
  const nextStreak = matched ? previous.streak + 1 : 0
  return {
    settled: true,
    matched,
    matchedItemId: matched ? picks[0].itemId : null,
    nextStreak,
    nextBestStreak: Math.max(previous.bestStreak, nextStreak)
  }
}
