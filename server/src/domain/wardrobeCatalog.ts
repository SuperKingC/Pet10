/** 衣柜套装目录与解锁条件：客户端只展示，解锁一律由服务端派生计算。 */

export type WardrobeSuitKey =
  | 'default'
  | 'scarf'
  | 'hoodie'
  | 'overalls'
  | 'dress'
  | 'raincoat'
  | 'pajamas'
  | 'bag'
  | 'hat'

export interface WardrobeUnlockContext {
  /** 小多利当前等级 */
  level: number
  /** 累计领取任务奖励次数（pet_events 的 task_claim 计数） */
  taskClaims: number
  /** 累计睡觉动作次数 */
  sleepCount: number
  /** 每日暗号双方都答上的连胜天数（截至今天） */
  codewordStreak: number
  /** 默契换装历史最高连胜 */
  matchBestStreak: number
}

export interface WardrobeSuitDef {
  key: WardrobeSuitKey
  name: string
  conditionText: string
  /** 参与默契换装时可被选择的套装（原装小多利也算一种当日装扮） */
  matchable: boolean
  isUnlocked(context: WardrobeUnlockContext): boolean
}

export const WARDROBE_CATALOG: WardrobeSuitDef[] = [
  { key: 'default', name: '原装小多利', conditionText: '', matchable: true, isUnlocked: () => true },
  { key: 'scarf', name: '围巾', conditionText: '初始赠送', matchable: true, isUnlocked: () => true },
  { key: 'hoodie', name: '连帽衫', conditionText: '初始赠送', matchable: true, isUnlocked: () => true },
  { key: 'overalls', name: '背带裤', conditionText: '一起完成 5 次任务解锁', matchable: true, isUnlocked: (c) => c.taskClaims >= 5 },
  { key: 'dress', name: '小裙子', conditionText: '暗号连胜 3 天解锁', matchable: true, isUnlocked: (c) => c.codewordStreak >= 3 },
  { key: 'raincoat', name: '雨衣', conditionText: '小多利 5 级解锁', matchable: true, isUnlocked: (c) => c.level >= 5 },
  { key: 'pajamas', name: '睡衣', conditionText: '陪小多利睡 20 次解锁', matchable: true, isUnlocked: (c) => c.sleepCount >= 20 },
  { key: 'bag', name: '小包', conditionText: '默契换装连胜 3 天解锁', matchable: true, isUnlocked: (c) => c.matchBestStreak >= 3 },
  { key: 'hat', name: '帽子', conditionText: '一起完成 15 次任务解锁', matchable: true, isUnlocked: (c) => c.taskClaims >= 15 }
]

export function findWardrobeSuit(key: string): WardrobeSuitDef | undefined {
  return WARDROBE_CATALOG.find((suit) => suit.key === key)
}

export function isWardrobeSuitKey(key: string): key is WardrobeSuitKey {
  return WARDROBE_CATALOG.some((suit) => suit.key === key)
}

/** 解锁视图：目录顺序 + unlocked 标记（服务端计算，客户端不重复判定） */
export function resolveWardrobeUnlock(context: WardrobeUnlockContext): Array<{
  key: WardrobeSuitKey
  name: string
  conditionText: string
  unlocked: boolean
}> {
  return WARDROBE_CATALOG.map((suit) => ({
    key: suit.key,
    name: suit.name,
    conditionText: suit.conditionText,
    unlocked: suit.isUnlocked(context)
  }))
}
