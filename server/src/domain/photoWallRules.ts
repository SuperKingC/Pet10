/** 照片墙纯规则：36 张上限与自动淘汰、caption 校验、origin 白名单。 */

export const PHOTO_WALL_LIMIT = 36
export const PHOTO_CAPTION_MAX = 40

export type PhotoWallOrigin = 'manual' | 'match_outfit' | 'levelup' | 'anniversary' | 'codeword_streak'

export const PHOTO_WALL_ORIGINS: PhotoWallOrigin[] = [
  'manual', 'match_outfit', 'levelup', 'anniversary', 'codeword_streak'
]

export function isPhotoWallOrigin(value: string): value is PhotoWallOrigin {
  return (PHOTO_WALL_ORIGINS as string[]).includes(value)
}

export function normalizeCaption(caption: string): string {
  return caption.trim().slice(0, PHOTO_CAPTION_MAX)
}

export interface EvictionCandidate {
  id: string
  origin: PhotoWallOrigin
  createdAt: Date
}

/**
 * 超上限时选被淘汰的手动照：只淘汰 origin=manual 中最旧的一张。
 * 默契卡不被自动淘汰，只能手动删；自动卡数量天然有冷却不会刷爆。
 */
export function pickEvictionId(
  existing: EvictionCandidate[],
  incomingOrigin: PhotoWallOrigin
): string | null {
  const totalAfterInsert = existing.length + 1
  if (totalAfterInsert <= PHOTO_WALL_LIMIT) return null
  // 只有手动照会挤占容量；自动卡到达时若已满则拒绝自动卡本身（有冷却，正常到不了）
  if (incomingOrigin !== 'manual') return null
  const manual = existing
    .filter((item) => item.origin === 'manual')
    .sort((first, second) => first.createdAt.getTime() - second.createdAt.getTime())
  return manual[0]?.id ?? null
}
