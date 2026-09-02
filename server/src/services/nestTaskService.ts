import type { NestTaskDef, NestTaskProgress, Pet, PetEventStat } from '../domain/models.js'
import { ACTION_COST, FEED_ITEM_IDS, ITEM_CATALOG, STARTER_POUCH, isItemId } from '../domain/itemCatalog.js'
import { NEST_TASK_DEFS, REPORTED_DAILY_METRICS, findTaskDef, taskDefOrder } from '../domain/nestTaskCatalog.js'
import type { RepositoryBundle } from '../repositories/contracts.js'

export interface NestTaskView {
  key: string
  scope: NestTaskDef['scope']
  title: string
  icon: string
  target: number
  metric: NestTaskDef['metric']
  rewardItems: NestTaskDef['rewardItems']
  rewardNames: string[]
  progress: number
  complete: boolean
  claimed: boolean
  locked: boolean
}

export interface InventoryPresentation {
  items: Array<{ itemId: string; name: string; count: number }>
}

function todayKey(now: Date) {
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function createNestTaskService(repositories: RepositoryBundle, options?: {
  now?: () => Date
  onRewardGranted?: (roomId: string, userId: string, taskKey: string, items: NestTaskDef['rewardItems']) => void
}) {
  const now = options?.now ?? (() => new Date())
  const onRewardGranted = options?.onRewardGranted ?? (() => undefined)

  async function assertMember(roomId: string, userId: string) {
    if (!(await repositories.rooms.isMember(roomId, userId))) throw new Error('room_forbidden')
  }

  async function pouchGranted(roomId: string) {
    await repositories.inventory.grantStarterPouchOnce(
      roomId,
      Object.entries(STARTER_POUCH).map(([itemId, count]) => ({ itemId, count })),
    )
  }

  /** 成就任务的累计事件基数（进度在事件计数基础上累计存储） */
  function statTotal(stats: PetEventStat[], action: string) {
    return stats.filter((stat) => stat.action === action).reduce((sum, stat) => sum + stat.count, 0)
  }

  /** 每日任务无进度行时能否用历史事件补记当天进度：照顾类可以，行为上报类不行 */
  function canBackfill(metric: string) {
    return metric !== 'checkin' && !REPORTED_DAILY_METRICS.has(metric)
  }

  return {
    /** 任务列表：每日任务（进度按当天事件实时计算）+ 成就任务（进度=累计事件计数） */
    async list(roomId: string, userId: string): Promise<NestTaskView[]> {
      await assertMember(roomId, userId)
      await pouchGranted(roomId)
      const today = todayKey(now())
      const pet = await repositories.pets.findByRoomId(roomId)
      const stats = pet ? await repositories.petEvents.statsByRoom(pet.id) : []
      const rows = await repositories.nestTaskProgress.listByRoom(roomId)
      const rowByKey = new Map(rows.map((row) => [row.taskKey, row]))
      const claimedAchievement = new Set(
        rows.filter((row) => row.claimed && row.periodKey === '').map((row) => row.taskKey)
      )

      return NEST_TASK_DEFS.map((def) => {
        const row = rowByKey.get(def.key)
        if (def.scope === 'daily') {
          // 每日进度行为准（动作/签到/行为上报写入当天周期）；照顾类无行时回退事件总量>0（历史行为当天补记），
          // 行为上报类（五子棋/塔罗/日记等）只认当天上报，不做历史补记
          const progress = row?.periodKey === today
            ? row.progress
            : (canBackfill(def.metric) && statTotal(stats, def.metric) > 0 ? 1 : 0)
          const claimedToday = Boolean(row?.claimed && row.periodKey === today)
          return {
            key: def.key, scope: def.scope, title: def.title, icon: def.icon,
            target: def.target, metric: def.metric, rewardItems: def.rewardItems,
            rewardNames: def.rewardItems.map((item) => ITEM_CATALOG[item.itemId as keyof typeof ITEM_CATALOG]?.name ?? item.itemId),
            progress: Math.min(progress, def.target),
            complete: progress >= def.target, claimed: claimedToday, locked: false
          }
        }
        const requires = def.requires ? claimedAchievement.has(def.requires) || Boolean(rowByKey.get(def.requires)?.claimed) : true
        const progress = Math.min(statTotal(stats, def.metric), def.target)
        return {
          key: def.key, scope: def.scope, title: def.title, icon: def.icon,
          target: def.target, metric: def.metric, rewardItems: def.rewardItems,
          rewardNames: def.rewardItems.map((item) => ITEM_CATALOG[item.itemId as keyof typeof ITEM_CATALOG]?.name ?? item.itemId),
          progress, complete: progress >= def.target,
          claimed: claimedAchievement.has(def.key) || Boolean(row?.claimed && row.periodKey === ''),
          locked: !requires
        }
      }).sort((first, second) => taskDefOrder(first.key) - taskDefOrder(second.key))
    },

    /** 领取奖励：任务完成且未领过（每日按周期、成就按永久）才发道具 */
    async claim(roomId: string, userId: string, taskKey: string): Promise<{
      taskKey: string
      grantedItems: NestTaskDef['rewardItems']
    }> {
      await assertMember(roomId, userId)
      const def = findTaskDef(taskKey)
      if (!def) throw new Error('nest_task_not_found')
      const today = todayKey(now())
      const pet = await repositories.pets.findByRoomId(roomId)
      const stats = pet ? await repositories.petEvents.statsByRoom(pet.id) : []
      const row = await repositories.nestTaskProgress.findByKey(roomId, taskKey)

      let complete = false
      let alreadyClaimed = false
      if (def.scope === 'daily') {
        // 与 list() 同口径：每日进度行为准，照顾类无行回退事件总量>0，行为上报类不回退
        const progress = row?.periodKey === today
          ? row.progress
          : (canBackfill(def.metric) && statTotal(stats, def.metric) > 0 ? 1 : 0)
        complete = progress >= def.target
        alreadyClaimed = Boolean(row?.claimed && row.periodKey === today)
      } else {
        complete = statTotal(stats, def.metric) >= def.target
        alreadyClaimed = Boolean(row?.claimed && row.periodKey === '')
        if (def.requires) {
          const requiredRow = await repositories.nestTaskProgress.findByKey(roomId, def.requires)
          if (!requiredRow?.claimed) throw new Error('nest_task_locked')
        }
      }
      if (alreadyClaimed) throw new Error('nest_task_already_claimed')
      if (!complete) throw new Error('nest_task_not_complete')

      await repositories.inventory.addBatch(roomId, def.rewardItems)
      // 每日任务领取要绑定当天周期，次日周期变化后可再领
      await repositories.nestTaskProgress.setDailyProgress(roomId, taskKey, def.scope === 'daily' ? today : '', def.scope === 'daily' ? def.target : def.target)
      await repositories.nestTaskProgress.markClaimed(roomId, taskKey, userId)
      onRewardGranted(roomId, userId, taskKey, def.rewardItems)
      return { taskKey, grantedItems: def.rewardItems }
    },

    async inventory(roomId: string, userId: string): Promise<InventoryPresentation> {
      await assertMember(roomId, userId)
      await pouchGranted(roomId)
      const items = await repositories.inventory.listByRoom(roomId)
      return {
        items: items
          .filter((item) => isItemId(item.itemId))
          .map((item) => ({ itemId: item.itemId, name: ITEM_CATALOG[item.itemId as keyof typeof ITEM_CATALOG].name, count: item.count }))
          .sort((first, second) => first.itemId.localeCompare(second.itemId))
      }
    },

    /** 照顾动作扣道具：喂食可在 FEED_ITEM_IDS 里指定（不传回落牛奶），睡觉免费；库存不足抛 insufficient_item */
    async consumeForAction(roomId: string, userId: string, action: string, itemId?: string): Promise<string | null> {
      const fallback = ACTION_COST[action as keyof typeof ACTION_COST]
      if (!fallback) {
        if (itemId) throw new Error('invalid_item')
        return null
      }
      // 喂食的消耗道具可选（牛奶/骨头），其余动作不接受指定
      const allowed: readonly string[] = FEED_ITEM_IDS.includes(fallback) ? FEED_ITEM_IDS : [fallback]
      const chosen = itemId ?? fallback
      if (!isItemId(chosen) || !allowed.includes(chosen)) throw new Error('invalid_item')
      await assertMember(roomId, userId)
      const consumed = await repositories.inventory.consume(roomId, chosen)
      if (!consumed) throw new Error('insufficient_item')
      return chosen
    },

    /** 照顾动作完成后记录每日任务进度（petService 调用；动作名即 metric 名） */
    async recordActionProgress(roomId: string, action: string): Promise<void> {
      const def = NEST_TASK_DEFS.find((entry) => entry.scope === 'daily' && entry.metric === action)
      if (!def) return
      await repositories.nestTaskProgress.setDailyProgress(roomId, def.key, todayKey(now()), 1)
    },

    /**
     * 行为上报：五子棋完局/塔罗解读/写日记/设纪念日/设置资料等客户端行为，
     * 写当日每日任务进度并累计 pet_events（成就计数与贡献榜数据源）。
     * 与照顾动作无关的纯客户端行为统一走这里，不再各自发明埋点。
     */
    async recordActivity(roomId: string, userId: string, metric: string): Promise<void> {
      if (!REPORTED_DAILY_METRICS.has(metric)) throw new Error('invalid_activity')
      const def = NEST_TASK_DEFS.find((entry) => entry.scope === 'daily' && entry.metric === metric)
      if (!def) throw new Error('invalid_activity')
      await assertMember(roomId, userId)
      const pet = await repositories.pets.findByRoomId(roomId)
      if (!pet) throw new Error('pet_not_found')
      await repositories.petEvents.record(pet.id, userId, metric)
      await repositories.nestTaskProgress.setDailyProgress(roomId, def.key, todayKey(now()), 1)
    },

    /** 签到：每天一次，写 checkin 每日进度并累计成就事件 */
    async checkin(roomId: string, userId: string): Promise<{ consecutiveDay: number }> {
      await assertMember(roomId, userId)
      const today = todayKey(now())
      const row = await repositories.nestTaskProgress.findByKey(roomId, 'daily_checkin')
      if (row && row.periodKey === today && row.progress >= 1) throw new Error('checkin_already_done')
      const pet = await repositories.pets.findByRoomId(roomId)
      if (!pet) throw new Error('pet_not_found')
      // 事件表累计（成就用），动作名 checkin
      await repositories.petEvents.record(pet.id, userId, 'checkin')
      await repositories.nestTaskProgress.setDailyProgress(roomId, 'daily_checkin', today, 1)
      return { consecutiveDay: 1 }
    },

    /** 默契换装钩子（衣柜期接入）：每完成一次默契打卡累计一次成就进度 */
    async recordOutfitMatch(roomId: string, userId: string): Promise<void> {
      const pet = await repositories.pets.findByRoomId(roomId)
      if (!pet) throw new Error('pet_not_found')
      await repositories.petEvents.record(pet.id, userId, 'outfit_match')
    }
  }
}
