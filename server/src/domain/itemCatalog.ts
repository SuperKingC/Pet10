import type { NestTaskRepeat, PetAction } from './models.js'

export type ItemId = 'dog_food' | 'ball' | 'soap' | 'bone'

export interface ItemDef {
  id: ItemId
  name: string
  icon: string
}

/** 照顾动作消耗的道具（睡觉是自然节律，永远免费，防「没道具→没法挣道具」死锁） */
export const ACTION_COST: Partial<Record<PetAction, ItemId>> = {
  feed: 'dog_food',
  play: 'ball',
  clean: 'soap'
}

/** 喂食可选的道具：客户端不传 itemId 时回落 ACTION_COST.feed（牛奶）；数值不分道具 */
export const FEED_ITEM_IDS: readonly ItemId[] = ['dog_food', 'bone']

export const ITEM_CATALOG: Record<ItemId, ItemDef> = {
  dog_food: { id: 'dog_food', name: '牛奶', icon: 'dog_food' },
  ball: { id: 'ball', name: '皮球', icon: 'ball' },
  soap: { id: 'soap', name: '香皂', icon: 'soap' },
  bone: { id: 'bone', name: '骨头', icon: 'bone' }
}

export function isItemId(value: string): value is ItemId {
  return value in ITEM_CATALOG
}

/** 首次进入任务面板发放的见面礼（room_pouches 保证只发一次） */
export const STARTER_POUCH: Record<ItemId, number> = {
  dog_food: 3,
  ball: 2,
  soap: 2,
  bone: 1
}

/** 建任务时奖励数量的上限（按周期防刷） */
export const REWARD_LIMITS: Record<NestTaskRepeat, { maxPerItem: number; maxExp: number }> = {
  daily: { maxPerItem: 3, maxExp: 20 },
  weekly: { maxPerItem: 7, maxExp: 60 },
  none: { maxPerItem: 5, maxExp: 40 }
}

/** 活跃任务数上限 */
export const NEST_TASK_LIMIT = 8
