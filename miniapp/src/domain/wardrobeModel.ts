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
 * 主体服装改为「原装立绘 + 服装切件」后，所有穿戴都画在同一张原装画布上，
 * 配饰恒定用这一套定位，不再随主体服装换算。
 */
export const OUTFIT_LAYER_STYLE: Partial<Record<SuitKey, { left: string; top: string; width: string }>> = {
  hat: { left: '25.00%', top: '3.14%', width: '50.00%' },
  scarf: { left: '21.10%', top: '57.86%', width: '57.80%' },
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

/** 主体服装叠层定位：chroma 管线（黑剪影狗穿衣→抠黑→与原装立绘仿射对齐）输出的全画布 436×700 叠层，位置恒定，由 miniapp/tools/cut-chroma-garments.mjs 生成 */
export const BODY_LAYER_STYLE: Partial<Record<SuitKey, { left: string; top: string; width: string }>> = {
  hoodie: { left: '0.00%', top: '0.00%', width: '100.00%' },
  overalls: { left: '0.00%', top: '0.00%', width: '100.00%' },
  dress: { left: '0.00%', top: '0.00%', width: '100.00%' },
  raincoat: { left: '0.00%', top: '0.00%', width: '100.00%' },
  pajamas: { left: '0.00%', top: '0.00%', width: '100.00%' }
}

/** 某主体服装切件在原装立绘上的叠加定位；原装无切件返回 undefined */
export function resolveBodyLayerStyle(body: SuitKey): { left: string; top: string; width: string } | undefined {
  return BODY_LAYER_STYLE[body]
}

/** 配饰叠加定位：所有穿戴都叠在同一张原装画布上，恒定用同一套标定 */
export function resolveOverlayStyle(accessory: SuitKey): { left: string; top: string; width: string } | undefined {
  return OUTFIT_LAYER_STYLE[accessory]
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
  /** 展示素材：叠穿件=服装图（网格与叠加共用），主体服装=整套穿装立绘（照片墙套装卡用） */
  display: string
  /** 主体服装切件叠加层（叠在原装立绘上）；叠穿件无此文件 */
  layer?: string
}

/** 每套的素材文件名：叠穿件一张文件、主体服装 icon+立绘+切件层三张 */
export function suitAssetFiles(key: string): SuitAssetFiles {
  if (isOverlaySuit(key)) {
    // 网格展示完整服饰；围巾的叠加层是折线切出的前襟（完整版叠图会盖住脸），帽/包整件即可叠
    const icon = key === 'scarf' ? 'outfit-scarf-v2.png' : `outfit-${key}-v3.png`
    const display = key === 'scarf' ? 'outfit-scarf-cut-v2.png' : icon
    return { icon, display }
  }
  return { icon: `${key}-icon-v2.png`, display: `${key}-v1.png`, layer: `${key}-layer-v4.png` }
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

/** 每页最多 6 件（2 行 × 3 列），同类超出翻下页，左右滑切换 */
export const WARDROBE_PAGE_SIZE = 6

export interface WardrobePage {
  kind: 'body' | 'accessory'
  label: string
  items: WardrobeItem[]
}

/** 目录 → 分页：先按类别归组（主体服装在前），组内按每页 6 件切块 */
export function wardrobePages(items: WardrobeItem[]): WardrobePage[] {
  const body = items.filter((item) => suitCategory(item.key) === 'body')
  const accessory = items.filter((item) => suitCategory(item.key) !== 'body')
  const chunk = (list: WardrobeItem[], kind: WardrobePage['kind'], label: string): WardrobePage[] => {
    const pages: WardrobePage[] = []
    for (let start = 0; start < list.length; start += WARDROBE_PAGE_SIZE) {
      pages.push({ kind, label, items: list.slice(start, start + WARDROBE_PAGE_SIZE) })
    }
    return pages
  }
  return [
    ...chunk(body, 'body', '🐾 主体服装（选一件）'),
    ...chunk(accessory, 'accessory', '🎀 配饰（可叠穿）')
  ]
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
