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

/** 随包内置素材：原装立绘 + 三件叠穿件（帽/巾/包，网格图标与叠加图层共用文件） */
export const BUNDLED_SUIT_KEYS: SuitKey[] = ['default', 'scarf', 'hat', 'bag']

export function isBundledSuit(key: string): boolean {
  return (BUNDLED_SUIT_KEYS as string[]).includes(key)
}

/**
 * 三件「叠穿件」的定位元数据：紧裁服装图按百分比绝对定位叠到原装小多利立绘（436×700）上。
 * 数值与 miniapp/tools/make-wardrobe-suits.mjs 的 cx/ty/w 标定一致，改素材必须同步。
 */
export const OUTFIT_LAYER_STYLE: Partial<Record<SuitKey, { left: string; top: string; width: string }>> = {
  hat: { left: '25.00%', top: '6.86%', width: '50.00%' },
  scarf: { left: '21.10%', top: '49.14%', width: '57.80%' },
  bag: { left: '21.10%', top: '74.00%', width: '27.52%' }
}

export function isOverlaySuit(key: string): boolean {
  return key in OUTFIT_LAYER_STYLE
}

export interface SuitAssetFiles {
  /** 网格服装特写图标 */
  icon: string
  /** 预览/场景展示素材：叠穿件=同一张服装图，主体服装=整套穿装立绘 */
  display: string
}

/** 每套的素材文件名：叠穿件网格图标=完整服饰、叠加层=切前襟（围巾）或整件（帽/包）；主体服装图标(AI)+立绘(旧) */
export function suitAssetFiles(key: string): SuitAssetFiles {
  if (isOverlaySuit(key)) {
    // 网格展示完整服饰；围巾的叠加层是折线切出的前襟（完整版叠图会盖住脸），帽/包整件即可叠
    const icon = key === 'scarf' ? 'outfit-scarf-v2.png' : `outfit-${key}-v3.png`
    const display = key === 'scarf' ? 'outfit-scarf-cut-v2.png' : icon
    return { icon, display }
  }
  return { icon: `${key}-icon-v2.png`, display: `${key}-v1.png` }
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
