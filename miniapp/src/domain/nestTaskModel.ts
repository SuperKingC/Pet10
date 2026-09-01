/** 系统预设任务（用户只完成不创建）的前端模型，与服务端 nestTaskCatalog/service 同口径 */

export type ItemId = 'dog_food' | 'ball' | 'soap' | 'bone'
export type NestTaskScope = 'daily' | 'achievement'
export type NestTaskMetric = 'checkin' | 'feed' | 'play' | 'clean' | 'sleep' | 'outfit_match'

export interface MiniappNestTask {
  key: string
  scope: NestTaskScope
  title: string
  icon: string
  target: number
  metric: NestTaskMetric
  rewardItems: Array<{ itemId: ItemId; count: number }>
  rewardNames: string[]
  progress: number
  complete: boolean
  claimed: boolean
  locked: boolean
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

/** 喂食可选的道具（与服务端 itemCatalog 同口径）：点喂食弹气泡二选一，数值不分道具 */
export const FEED_ITEM_IDS: readonly ItemId[] = ['dog_food', 'bone']

export const ITEM_NAMES: Record<ItemId, string> = {
  dog_food: '牛奶',
  ball: '皮球',
  soap: '香皂',
  bone: '骨头'
}

export function itemCount(inventory: MiniappInventory | null, itemId: ItemId): number {
  return inventory?.items.find((item) => item.itemId === itemId)?.count ?? 0
}

export type ActionAvailability = 'ready' | 'missing_item' | 'free'

export function getActionAvailability(
  action: 'feed' | 'play' | 'clean' | 'sleep',
  inventory: MiniappInventory | null,
): ActionAvailability {
  const itemId = ACTION_ITEM[action]
  if (!itemId) return 'free'
  // 喂食是牛奶/骨头二选一：任一有货即可喂
  const choices = itemId === ACTION_ITEM.feed ? FEED_ITEM_IDS : [itemId]
  return choices.some((id) => itemCount(inventory, id) > 0) ? 'ready' : 'missing_item'
}

export function rewardSummary(task: Pick<MiniappNestTask, 'rewardItems'>): string {
  return task.rewardItems
    .map((item) => `${ITEM_NAMES[item.itemId] ?? item.itemId}×${item.count}`)
    .join(' + ') || '小多利很开心'
}

/** 任务按钮状态：已领 → done；完成未领 → 可领奖；进行中 → 进度文案；锁定 → 锁 */
export type TaskButtonState =
  | { kind: 'claimed' }
  | { kind: 'claim' }
  | { kind: 'progress' }
  | { kind: 'locked' }

export function getTaskButton(task: MiniappNestTask): TaskButtonState {
  if (task.claimed) return { kind: 'claimed' }
  if (task.locked) return { kind: 'locked' }
  if (task.complete) return { kind: 'claim' }
  return { kind: 'progress' }
}

export function insufficientMessage(action: 'feed' | 'play' | 'clean' | 'sleep'): string {
  if (action === 'feed') return '牛奶和骨头都不够啦，去做任务获得一些吧'
  const itemId = ACTION_ITEM[action]
  const name = itemId ? ITEM_NAMES[itemId] : ''
  return `${name}不够啦，去做任务获得一些吧`
}

/** 任务分组：每日在上、成就在下（服务端已按目录排序，这里兜底） */
export function groupTasks(tasks: MiniappNestTask[]) {
  return {
    daily: tasks.filter((task) => task.scope === 'daily'),
    achievement: tasks.filter((task) => task.scope === 'achievement')
  }
}
