import type { PetEventStat } from '../domain/models.js'
import {
  findWardrobeSuit,
  resolveWardrobeUnlock,
  type WardrobeSuitKey,
  type WardrobeUnlockContext
} from '../domain/wardrobeCatalog.js'
import {
  resolveMatchOutcome,
  shouldSettleMatch,
  type OutfitMatchPick as MatchPick
} from '../domain/outfitMatchRules.js'
import type { RepositoryBundle } from '../repositories/contracts.js'
import { computeBothAnsweredStreak, shanghaiDayKey } from './codewordStreak.js'

export interface WardrobeItemView {
  key: WardrobeSuitKey
  name: string
  conditionText: string
  unlocked: boolean
}

export interface MatchTodayView {
  myPick: string | null
  partnerPicked: boolean
  matchedToday: boolean
  streak: number
  bestStreak: number
}

export interface WardrobeView {
  equipped: string
  items: WardrobeItemView[]
  match: MatchTodayView
}

export interface MatchSettledEvent {
  roomId: string
  day: string
  matched: boolean
  itemId: string
  streak: number
  participantIds: string[]
}

export function createWardrobeService(repositories: RepositoryBundle, options?: {
  now?: () => Date
  /** 结算成功（过门闩）后触发；app 层据此入墙默契卡、发奖励与广播 */
  onMatchSettled?: (event: MatchSettledEvent) => void
}) {
  const now = options?.now ?? (() => new Date())
  const onMatchSettled = options?.onMatchSettled ?? (() => undefined)

  async function assertMember(roomId: string, userId: string) {
    if (!(await repositories.rooms.isMember(roomId, userId))) throw new Error('room_forbidden')
  }

  function statTotal(stats: PetEventStat[], action: string) {
    return stats.filter((stat) => stat.action === action).reduce((sum, stat) => sum + stat.count, 0)
  }

  async function unlockContext(roomId: string): Promise<WardrobeUnlockContext> {
    const pet = await repositories.pets.findByRoomId(roomId)
    const stats = pet ? await repositories.petEvents.statsByRoom(pet.id) : []
    const matchStreak = await repositories.outfitMatch.getStreak(roomId)
    const codewordStreak = await computeBothAnsweredStreak(
      repositories.codewords,
      roomId,
      shanghaiDayKey(now())
    )
    return {
      level: pet?.level ?? 1,
      taskClaims: statTotal(stats, 'task_claim'),
      sleepCount: statTotal(stats, 'sleep'),
      codewordStreak,
      matchBestStreak: matchStreak?.bestStreak ?? 0
    }
  }

  async function matchTodayView(roomId: string, userId: string, today: string): Promise<MatchTodayView> {
    const picks = await repositories.outfitMatch.listPicks(roomId, today)
    const streak = await repositories.outfitMatch.getStreak(roomId)
    const mine = picks.find((pick) => pick.userId === userId)
    const partner = picks.find((pick) => pick.userId !== userId)
    // 是否默契从当日双方 picks 直接派生（不一致的结算同样会写 lastMatchDay）
    const matchedToday = Boolean(mine && partner && mine.itemId === partner.itemId)
    return {
      myPick: mine?.itemId ?? null,
      partnerPicked: Boolean(partner),
      matchedToday,
      streak: streak?.streak ?? 0,
      bestStreak: streak?.bestStreak ?? 0
    }
  }

  /** 双方都选齐则结算（幂等门闩：当天只结一次，先到先结算） */
  async function trySettleToday(roomId: string): Promise<void> {
    const today = shanghaiDayKey(now())
    const picks: MatchPick[] = await repositories.outfitMatch.listPicks(roomId, today)
    const streak = await repositories.outfitMatch.getStreak(roomId)
    const alreadySettled = streak?.lastMatchDay === today
    if (!shouldSettleMatch(
      picks.map((pick) => ({ userId: pick.userId, itemId: pick.itemId })),
      alreadySettled
    )) return
    const outcome = resolveMatchOutcome(
      picks.map((pick) => ({ userId: pick.userId, itemId: pick.itemId })),
      { streak: streak?.streak ?? 0, bestStreak: streak?.bestStreak ?? 0 }
    )
    const gated = await repositories.outfitMatch.markSettled(roomId, today, outcome.nextStreak, outcome.nextBestStreak)
    if (!gated) return
    onMatchSettled({
      roomId,
      day: today,
      matched: outcome.matched,
      itemId: outcome.matchedItemId ?? picks[0].itemId,
      streak: outcome.nextStreak,
      participantIds: [...new Set(picks.map((pick) => pick.userId))]
    })
  }

  return {
    async get(roomId: string, userId: string): Promise<WardrobeView> {
      await assertMember(roomId, userId)
      await trySettleToday(roomId)
      const today = shanghaiDayKey(now())
      const [context, state, match] = await Promise.all([
        unlockContext(roomId),
        repositories.wardrobe.getState(roomId),
        matchTodayView(roomId, userId, today)
      ])
      return {
        equipped: state?.equipped ?? 'default',
        items: resolveWardrobeUnlock(context),
        match
      }
    },

    /** 保存当前展示套装；未解锁 409 wardrobe_locked */
    async setEquipped(roomId: string, userId: string, suitKey: string): Promise<{ equipped: string }> {
      await assertMember(roomId, userId)
      const suit = findWardrobeSuit(suitKey)
      if (!suit) throw new Error('invalid_suit')
      const context = await unlockContext(roomId)
      if (!suit.isUnlocked(context)) throw new Error('wardrobe_locked')
      await repositories.wardrobe.setEquipped(roomId, suitKey)
      return { equipped: suitKey }
    },

    /** 提交今日默契选择：每人每天一次，提交后当天锁定；双方齐时立即结算 */
    async submitMatchPick(roomId: string, userId: string, itemKey: string): Promise<MatchTodayView> {
      await assertMember(roomId, userId)
      const today = shanghaiDayKey(now())
      const existing = await repositories.outfitMatch.listPicks(roomId, today)
      if (existing.some((pick) => pick.userId === userId)) throw new Error('outfit_match_already_picked')
      const suit = findWardrobeSuit(itemKey)
      if (!suit || !suit.matchable) throw new Error('invalid_suit')
      const context = await unlockContext(roomId)
      if (!suit.isUnlocked(context)) throw new Error('wardrobe_locked')
      await repositories.outfitMatch.setPick(roomId, today, userId, itemKey)
      await trySettleToday(roomId)
      return matchTodayView(roomId, userId, today)
    }
  }
}
