/** 照片墙展示模型：来源徽章、自动卡判定、栅格拆列与日期文案的纯函数。 */

export type PhotoOrigin = 'manual' | 'match_outfit' | 'levelup' | 'anniversary' | 'codeword_streak'

export interface PhotoWallItem {
  id: string
  origin: PhotoOrigin
  /** 手动照为 dataURL；自动卡为空串（按 origin 渲染模板卡） */
  photo: string
  caption: string
  /** 默契卡的套装 key */
  refKey: string | null
  takenDay: string | null
  createdAt: string
  userName: string | null
}

export const PHOTO_CAPTION_MAX = 40

export function originBadge(origin: PhotoOrigin): string {
  if (origin === 'levelup') return '🏆 升级'
  if (origin === 'codeword_streak') return '🔑 暗号'
  if (origin === 'match_outfit') return '👕 默契'
  if (origin === 'anniversary') return '📅 纪念日'
  return ''
}

/** 自动卡没有真实照片，按模板卡渲染 */
export function isAutoCard(item: PhotoWallItem): boolean {
  return item.photo === ''
}

export function normalizePhotoCaption(caption: string): string {
  return caption.trim().slice(0, PHOTO_CAPTION_MAX)
}

/** YYYY-MM-DD / ISO → 「M月D日」；直接取日期段解析，避免时区漂移 */
export function photoDayText(value: string | null): string {
  if (!value) return ''
  const day = value.length > 10 ? value.slice(0, 10) : value
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (!matched) return ''
  return `${Number(matched[2])}月${Number(matched[3])}日`
}

/** 拍立得墙两列拆分：按序号奇偶分列，保持各自列内上下衔接 */
export function splitPhotoColumns<T>(items: T[], columns = 2): T[][] {
  const buckets: T[][] = Array.from({ length: columns }, () => [])
  items.forEach((item, index) => {
    buckets[index % columns].push(item)
  })
  return buckets
}
