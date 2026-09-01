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
  /** 套装类别：主体服装或配饰；每类最多穿一件 */
  category: WardrobeCategory
  isUnlocked(context: WardrobeUnlockContext): boolean
}

export const WARDROBE_CATALOG: WardrobeSuitDef[] = [
  { key: 'default', name: '原装小多利', conditionText: '', matchable: true, category: 'body', isUnlocked: () => true },
  { key: 'scarf', name: '围巾', conditionText: '初始赠送', matchable: true, category: 'scarf', isUnlocked: () => true },
  { key: 'hoodie', name: '连帽衫', conditionText: '初始赠送', matchable: true, category: 'body', isUnlocked: () => true },
  { key: 'overalls', name: '背带裤', conditionText: '一起完成 5 次任务解锁', matchable: true, category: 'body', isUnlocked: (c) => c.taskClaims >= 5 },
  { key: 'dress', name: '小裙子', conditionText: '暗号连胜 3 天解锁', matchable: true, category: 'body', isUnlocked: (c) => c.codewordStreak >= 3 },
  { key: 'raincoat', name: '雨衣', conditionText: '小多利 5 级解锁', matchable: true, category: 'body', isUnlocked: (c) => c.level >= 5 },
  { key: 'pajamas', name: '睡衣', conditionText: '陪小多利睡 20 次解锁', matchable: true, category: 'body', isUnlocked: (c) => c.sleepCount >= 20 },
  { key: 'bag', name: '小包', conditionText: '默契换装连胜 3 天解锁', matchable: true, category: 'bag', isUnlocked: (c) => c.matchBestStreak >= 3 },
  { key: 'hat', name: '帽子', conditionText: '一起完成 15 次任务解锁', matchable: true, category: 'hat', isUnlocked: (c) => c.taskClaims >= 15 }
]

export function findWardrobeSuit(key: string): WardrobeSuitDef | undefined {
  return WARDROBE_CATALOG.find((suit) => suit.key === key)
}

export function isWardrobeSuitKey(key: string): key is WardrobeSuitKey {
  return WARDROBE_CATALOG.some((suit) => suit.key === key)
}

/** 套装类别：主体服装（整身立绘）与三类配饰（叠加件）；每类最多穿一件 */
export type WardrobeCategory = 'body' | 'hat' | 'scarf' | 'bag'

export interface WardrobeOutfitPieces {
  body: WardrobeSuitKey
  hat: WardrobeSuitKey | null
  scarf: WardrobeSuitKey | null
  bag: WardrobeSuitKey | null
}

const ACCESSORY_SLOTS = ['hat', 'scarf', 'bag'] as const

function suitMatchesCategory(key: unknown, slot: WardrobeCategory): key is WardrobeSuitKey {
  if (typeof key !== 'string') return false
  const suit = findWardrobeSuit(key)
  return Boolean(suit && suit.category === slot)
}

/** 存储值（旧单 key 字符串或新 JSON 套装）统一解析为穿戴件；未知/类别不符的 key 丢弃，body 兜底原装 */
export function parseEquippedPieces(value: string | null | undefined): WardrobeOutfitPieces {
  const pieces: WardrobeOutfitPieces = { body: 'default', hat: null, scarf: null, bag: null }
  if (!value) return pieces
  if (!value.trim().startsWith('{')) {
    // 旧数据：单 key 可能是主体服装，也可能是被当作「全身装扮」的配饰
    const suit = findWardrobeSuit(value)
    if (suit) {
      if (suit.category === 'body') pieces.body = suit.key
      else if (suit.category !== 'body') pieces[suit.category] = suit.key
    }
    return pieces
  }
  try {
    const raw = JSON.parse(value) as Record<string, unknown>
    if (suitMatchesCategory(raw.body, 'body')) pieces.body = raw.body
    for (const slot of ACCESSORY_SLOTS) {
      pieces[slot] = suitMatchesCategory(raw[slot], slot) ? raw[slot] : null
    }
  } catch {
    // 非法 JSON 视为空套装（兜底原装）
  }
  return pieces
}

export function serializeEquippedPieces(pieces: WardrobeOutfitPieces): string {
  return JSON.stringify({ body: pieces.body, hat: pieces.hat, scarf: pieces.scarf, bag: pieces.bag })
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
