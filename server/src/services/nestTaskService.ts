import type { NestTask, NestTaskRewardItem, Pet } from '../domain/models.js'
import { ACTION_COST, ITEM_CATALOG, NEST_TASK_LIMIT, REWARD_LIMITS, STARTER_POUCH, isItemId } from '../domain/itemCatalog.js'
import { applyTaskReward, isDoneToday, validateReward } from '../domain/nestTaskRules.js'
import type { RepositoryBundle } from '../repositories/contracts.js'

export interface NestTaskPresentation extends NestTask {
  doneToday: boolean
  doneByName: string | null
}

export interface InventoryPresentation {
  items: Array<{ itemId: string; name: string; count: number }>
}

function todayKey(now: Date) {
  // 与小程序端一致的简化口径：服务器本地时区的年月日
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function createNestTaskService(repositories: RepositoryBundle, options?: {
  now?: () => Date
  onTaskCompleted?: (roomId: string, userId: string, pet: Pet, leveledUp: boolean, grantedItems: NestTaskRewardItem[]) => void
}) {
  const now = options?.now ?? (() => new Date())
  const onTaskCompleted = options?.onTaskCompleted ?? (() => undefined)

  async function assertMember(roomId: string, userId: string) {
    if (!(await repositories.rooms.isMember(roomId, userId))) throw new Error('room_forbidden')
  }

  async function pouchGranted(roomId: string) {
    await repositories.inventory.grantStarterPouchOnce(
      roomId,
      Object.entries(STARTER_POUCH).map(([itemId, count]) => ({ itemId, count })),
    )
  }

  function present(task: NestTask, today: string, names: Map<string, string>): NestTaskPresentation {
    return {
      ...task,
      doneToday: isDoneToday(task, today),
      doneByName: task.lastCompletedBy ? names.get(task.lastCompletedBy) ?? null : null
    }
  }

  return {
    async list(roomId: string, userId: string): Promise<NestTaskPresentation[]> {
      await assertMember(roomId, userId)
      await pouchGranted(roomId)
      const today = todayKey(now())
      const tasks = await repositories.nestTasks.listByRoom(roomId)
      const names = new Map<string, string>()
      for (const task of tasks) {
        if (task.lastCompletedBy && !names.has(task.lastCompletedBy)) {
          const user = await repositories.users.findById(task.lastCompletedBy)
          names.set(task.lastCompletedBy, user?.displayName ?? '好友')
        }
      }
      return tasks.map((task) => present(task, today, names))
    },

    async create(roomId: string, userId: string, input: {
      title: string
      icon?: string
      repeatRule: NestTask['repeatRule']
      rewardItems: NestTaskRewardItem[]
      rewardExp: number
    }): Promise<NestTask> {
      await assertMember(roomId, userId)
      const active = await repositories.nestTasks.countActive(roomId)
      if (active >= NEST_TASK_LIMIT) throw new Error('nest_task_limit')
      for (const item of input.rewardItems) {
        if (!isItemId(item.itemId)) throw new Error('invalid_item')
      }
      if (!validateReward(input.repeatRule, input.rewardItems, input.rewardExp, REWARD_LIMITS[input.repeatRule])) {
        throw new Error('invalid_reward')
      }
      return repositories.nestTasks.create({
        roomId,
        createdBy: userId,
        title: input.title,
        icon: input.icon ?? 'paw',
        repeatRule: input.repeatRule,
        rewardItems: input.rewardItems,
        rewardExp: input.rewardExp
      })
    },

    async update(roomId: string, userId: string, taskId: string, patch: {
      title?: string
      icon?: string
      repeatRule?: NestTask['repeatRule']
      rewardItems?: NestTaskRewardItem[]
      rewardExp?: number
      archived?: boolean
    }): Promise<NestTask> {
      await assertMember(roomId, userId)
      if (patch.repeatRule && (patch.rewardItems || patch.rewardExp !== undefined)) {
        const existing = await repositories.nestTasks.findById(roomId, taskId)
        if (!existing) throw new Error('nest_task_not_found')
        const repeatRule = patch.repeatRule ?? existing.repeatRule
        const rewardItems = patch.rewardItems ?? existing.rewardItems
        const rewardExp = patch.rewardExp ?? existing.rewardExp
        for (const item of rewardItems) {
          if (!isItemId(item.itemId)) throw new Error('invalid_item')
        }
        if (!validateReward(repeatRule, rewardItems, rewardExp, REWARD_LIMITS[repeatRule])) {
          throw new Error('invalid_reward')
        }
      }
      const updated = await repositories.nestTasks.update(roomId, taskId, patch)
      if (!updated) throw new Error('nest_task_not_found')
      return updated
    },

    async complete(roomId: string, userId: string, taskId: string): Promise<{
      task: NestTask
      pet: Pet
      leveledUp: boolean
      grantedItems: NestTaskRewardItem[]
    }> {
      await assertMember(roomId, userId)
      const task = await repositories.nestTasks.findById(roomId, taskId)
      if (!task || task.archived) throw new Error('nest_task_not_found')
      const today = todayKey(now())
      if (isDoneToday(task, today)) throw new Error('nest_task_already_done')

      const pet = await repositories.pets.findByRoomId(roomId)
      if (!pet) throw new Error('pet_not_found')

      await repositories.inventory.addBatch(roomId, task.rewardItems)
      const marked = await repositories.nestTasks.markCompleted(roomId, taskId, today, userId)
      const reward = applyTaskReward(pet, task.rewardExp)
      const leveledUp = reward.leveledUp
      const saved = await repositories.pets.update({
        ...pet,
        level: reward.level,
        experience: reward.experience,
        experienceToNextLevel: reward.experienceToNextLevel
      })
      onTaskCompleted(roomId, userId, saved, leveledUp, task.rewardItems)
      return { task: marked ?? task, pet: saved, leveledUp, grantedItems: task.rewardItems }
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

    /** 照顾动作扣道具：成功返回消耗的道具 id；睡觉免费；库存不足抛 insufficient_item */
    async consumeForAction(roomId: string, userId: string, action: string): Promise<string | null> {
      const itemId = ACTION_COST[action as keyof typeof ACTION_COST]
      if (!itemId) return null
      await assertMember(roomId, userId)
      const consumed = await repositories.inventory.consume(roomId, itemId)
      if (!consumed) throw new Error('insufficient_item')
      return itemId
    }
  }
}
