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
  /** 当前穿戴（按类别，服务端解析存储后返回；旧服务端无此字段） */
  outfit?: { body?: string; hat?: string | null; scarf?: string | null; bag?: string | null }
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

export type SuitCategory = 'body' | 'hat' | 'scarf' | 'bag'

/** 套装类别：主体服装（整身立绘）与三类配饰（叠加件），每类最多穿一件 */
export function suitCategory(key: SuitKey): SuitCategory {
  if (key === 'hat' || key === 'scarf' || key === 'bag') return key
  return 'body'
}

/** 一套穿戴：body 必有，配饰可空（未佩戴） */
export interface OutfitPieces {
  body: SuitKey
  hat: SuitKey | null
  scarf: SuitKey | null
  bag: SuitKey | null
}

export const EMPTY_OUTFIT: OutfitPieces = { body: 'default', hat: null, scarf: null, bag: null }

/** 主体服装（非原装）× 配饰的叠加定位：由 miniapp/tools/calibrate-body-overlays.mjs 按同姿势紧裁立绘线性换算，改素材必须重跑 */
export const BODY_OVERLAY_STYLE: Partial<Record<string, Partial<Record<SuitKey, { left: string; top: string; width: string }>>>> = {
  hoodie: {
    hat: { left: '29.66%', top: '6.86%', width: '40.68%' },
    scarf: { left: '26.49%', top: '49.14%', width: '47.02%' },
    bag: { left: '26.49%', top: '74.00%', width: '22.39%' }
  },
  overalls: {
    hat: { left: '26.27%', top: '6.86%', width: '47.46%' },
    scarf: { left: '22.57%', top: '49.14%', width: '54.86%' },
    bag: { left: '22.57%', top: '74.00%', width: '26.12%' }
  },
  dress: {
    hat: { left: '27.14%', top: '6.86%', width: '45.71%' },
    scarf: { left: '23.58%', top: '49.14%', width: '52.84%' },
    bag: { left: '23.58%', top: '74.00%', width: '25.16%' }
  },
  raincoat: {
    hat: { left: '23.64%', top: '6.86%', width: '52.73%' },
    scarf: { left: '19.52%', top: '49.14%', width: '60.95%' },
    bag: { left: '19.52%', top: '74.00%', width: '29.02%' }
  },
  pajamas: {
    hat: { left: '19.05%', top: '6.86%', width: '61.90%' },
    scarf: { left: '14.22%', top: '49.14%', width: '71.55%' },
    bag: { left: '14.22%', top: '74.00%', width: '34.07%' }
  }
}

/** 某主体服装上某配饰的叠加定位；无标定返回 undefined（不渲染该配饰） */
export function resolveOverlayStyle(body: SuitKey, accessory: SuitKey): { left: string; top: string; width: string } | undefined {
  if (body === 'default') return OUTFIT_LAYER_STYLE[accessory]
  return BODY_OVERLAY_STYLE[body]?.[accessory]
}

/** 各主体立绘宽高比（w/h）：固定显示高度下按此换算宽度，保证 aspectFit 恰好满盒（叠加定位与图对齐的前提） */
export const SUIT_DISPLAY_ASPECT: Record<string, number> = {
  default: 436 / 700,
  hoodie: 245 / 320,
  overalls: 210 / 320,
  dress: 218 / 320,
  raincoat: 189 / 320,
  pajamas: 161 / 320
}

/** 固定显示高度下某套装的显示宽度（与高度同单位） */
export function suitDisplayWidth(key: string, height: number): number {
  const aspect = SUIT_DISPLAY_ASPECT[key] ?? SUIT_DISPLAY_ASPECT.default
  return Math.round(height * aspect)
}

/** 服务端视图 → 穿戴件；未解锁/未知件丢弃（服务端已校验，客户端兜底），旧视图单 key 按类别落位 */
export function outfitPiecesFromView(view: WardrobeView | null | undefined): OutfitPieces {
  const unlocked = new Set((view?.items ?? []).filter((item) => item.unlocked).map((item) => item.key))
  const pieces: OutfitPieces = { ...EMPTY_OUTFIT }
  const raw = view?.outfit
  if (raw) {
    if (typeof raw.body === 'string' && unlocked.has(raw.body)) pieces.body = raw.body as SuitKey
    for (const acc of ['hat', 'scarf', 'bag'] as const) {
      const value = raw[acc]
      if (typeof value === 'string' && unlocked.has(value)) pieces[acc] = value as SuitKey
    }
    return pieces
  }
  const legacy = view?.equipped
  if (legacy && unlocked.has(legacy)) {
    const category = suitCategory(legacy as SuitKey)
    if (category === 'body') pieces.body = legacy as SuitKey
    else pieces[category] = legacy as SuitKey
  }
  return pieces
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
