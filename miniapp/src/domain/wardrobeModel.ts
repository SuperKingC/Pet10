/** 衣柜展示模型：与服务端 wardrobeCatalog 同口径的目录镜像 + 徽章/资产可用性纯判定。 */

export type SuitKey =
  | 'default'
  | 'scarf'
  | 'hoodie'
  | 'overalls'
  | 'dress'
  | 'raincoat'
  | 'pajamas'
  | 'bag'
  | 'hat'

export interface WardrobeItem {
  key: SuitKey
  name: string
  conditionText: string
  unlocked: boolean
}

export interface MatchToday {
  myPick: string | null
  partnerPicked: boolean
  matchedToday: boolean
  streak: number
  bestStreak: number
}

export interface WardrobeView {
  equipped: string
  items: WardrobeItem[]
  match: MatchToday
}

/** 随包内置素材的套装（其余从 COS 按需下载后落本地缓存） */
export const BUNDLED_SUIT_KEYS: SuitKey[] = ['default', 'scarf']

export function isBundledSuit(key: string): boolean {
  return (BUNDLED_SUIT_KEYS as string[]).includes(key)
}

/** 获得途径徽章：从条件文案派生，未解锁的套装显示途径角标 */
export function suitBadge(item: WardrobeItem): '任务' | '等级' | '暗号' | '默契' | '睡觉' | '初始' | null {
  if (item.unlocked) return null
  if (item.conditionText.includes('任务')) return '任务'
  if (item.conditionText.includes('级')) return '等级'
  if (item.conditionText.includes('暗号')) return '暗号'
  if (item.conditionText.includes('默契')) return '默契'
  if (item.conditionText.includes('睡')) return '睡觉'
  if (item.conditionText.includes('初始')) return '初始'
  return null
}

/** 衣柜网格顺序即服务端目录顺序，无需再排序 */
export function selectedOrDefault(view: WardrobeView | null, selected: string | null): string {
  if (selected) return selected
  return view?.equipped ?? 'default'
}

/** 今日默契状态一句话（用于衣柜面板与底部横卡） */
export function matchSummary(match: MatchToday): string {
  if (match.matchedToday) return `今日默契达成！连胜 ${match.streak} 天`
  if (match.myPick && match.partnerPicked) return '今日已结算，明天再试试'
  if (match.myPick) return '已选好啦，就等 TA 了'
  if (match.partnerPicked) return 'TA 已选好啦，就等你了'
  if (match.streak > 0) return `当前连胜 ${match.streak} 天，选一套今日装扮吧`
  return '各选一套当日装扮，一致即默契达成'
}
