import type { PetState } from './types'

export type NestTaskRepeat = 'daily' | 'weekly' | 'none'
export type ItemId = 'dog_food' | 'ball' | 'soap'

export interface MiniappNestTask {
  id: string
  title: string
  icon: string
  repeatRule: NestTaskRepeat
  rewardItems: Array<{ itemId: string; count: number }>
  rewardExp: number
  lastCompletedDay: string | null
  doneToday: boolean
  doneByName: string | null
  archived: boolean
}

export interface MiniappInventory {
  items: Array<{ itemId: ItemId; name: string; count: number }>
}

/** 照顾动作 → 消耗道具映射（与服务端 itemCatalog 一致；睡觉免费防死锁） */
export const ACTION_ITEM: Partial<Record<'feed' | 'play' | 'clean' | 'sleep', ItemId>> = {
  feed: 'dog_food',
  play: 'ball',
  clean: 'soap'
}

export const ITEM_NAMES: Record<ItemId, string> = {
  dog_food: '狗粮',
  ball: '皮球',
  soap: '香皂'
}

export function itemCount(inventory: MiniappInventory | null, itemId: ItemId): number {
  return inventory?.items.find((item) => item.itemId === itemId)?.count ?? 0
}

export type ActionAvailability = 'ready' | 'missing_item' | 'free'

/** 照顾面板按钮可用性：睡觉永远可用；其他动作需要对应道具 */
export function getActionAvailability(
  action: 'feed' | 'play' | 'clean' | 'sleep',
  inventory: MiniappInventory | null,
): ActionAvailability {
  const itemId = ACTION_ITEM[action]
  if (!itemId) return 'free'
  return itemCount(inventory, itemId) > 0 ? 'ready' : 'missing_item'
}

export function rewardSummary(task: Pick<MiniappNestTask, 'rewardItems' | 'rewardExp'>): string {
  const parts = task.rewardItems.map((item) => `${ITEM_NAMES[item.itemId as ItemId] ?? item.itemId}×${item.count}`)
  if (task.rewardExp > 0) parts.push(`经验+${task.rewardExp}`)
  return parts.join(' · ') || '小多利很开心'
}

export const REPEAT_LABELS: Record<NestTaskRepeat, string> = {
  daily: '每天',
  weekly: '每周',
  none: '一次'
}

export interface NestTaskInput {
  title: string
  icon: string
  repeatRule: NestTaskRepeat
  rewardItems: Array<{ itemId: ItemId; count: number }>
  rewardExp: number
}

/** 每周期奖励上限（与服务端 REWARD_LIMITS 一致，前端先挡一道） */
export const REWARD_LIMITS: Record<NestTaskRepeat, { maxPerItem: number; maxExp: number }> = {
  daily: { maxPerItem: 3, maxExp: 20 },
  weekly: { maxPerItem: 7, maxExp: 60 },
  none: { maxPerItem: 5, maxExp: 40 }
}

export function validateTaskInput(input: NestTaskInput): string | null {
  if (!input.title.trim()) return '给任务起个名字吧'
  const limits = REWARD_LIMITS[input.repeatRule]
  if (input.rewardExp < 0 || input.rewardExp > limits.maxExp) return '奖励经验超出上限'
  for (const item of input.rewardItems) {
    if (item.count < 1 || item.count > limits.maxPerItem) return '道具数量超出上限'
  }
  return null
}

export function insufficientMessage(action: 'feed' | 'play' | 'clean' | 'sleep'): string {
  const itemId = ACTION_ITEM[action]
  const name = itemId ? ITEM_NAMES[itemId] : ''
  return `${name}不够啦，去做任务获得一些吧`
}

/** 供测试注入的 PetState 最小形状（避免循环依赖具体组件） */
export function petExpPreview(pet: Pick<PetState, 'level' | 'experience' | 'experienceToNextLevel'>) {
  return { level: pet.level, experience: pet.experience, experienceToNextLevel: pet.experienceToNextLevel }
}
