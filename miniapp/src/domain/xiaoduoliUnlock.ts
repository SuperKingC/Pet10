export const UNLOCK_BUTTON_LABEL = '玩家已接受邀请解锁小多利~'
export const UNLOCK_JUMP_DURATION_MS = 1600

export type XiaoduoliUnlockState = {
  initialized: boolean
  unlockedRoomIds: string[]
}

export type UnlockRibbon = {
  left: number
  delay: number
  duration: number
  rotate: number
  color: string
}

export type UnlockStar = {
  left: number
  top: number
  delay: number
  duration: number
}

export type UnlockScrap = {
  left: number
  delay: number
  duration: number
  rotate: number
  drift: number
  size: number
  color: string
}

const ribbonColors = ['#f3d5a8', '#f08a6c', '#efbe68', '#7ec8b8', '#fff7e8']
// 纸屑取破纸箱的牛皮纸色系，比彩带更贴「撞破纸箱」的叙事
const scrapColors = ['#c98d5a', '#b9744a', '#d9a878', '#8f5a34']

export function nextUnlockState(input: {
  stored: XiaoduoliUnlockState | null
  petRoomIds: string[]
  pendingRoomIds: string[]
}): XiaoduoliUnlockState {
  const pending = unique(input.pendingRoomIds.filter(Boolean))
  if (!input.stored?.initialized) {
    return {
      initialized: true,
      unlockedRoomIds: unique(input.petRoomIds.filter((roomId) => !pending.includes(roomId))),
    }
  }

  return {
    initialized: true,
    unlockedRoomIds: unique(input.stored.unlockedRoomIds.filter((roomId) => !pending.includes(roomId))),
  }
}

export function isRoomUnlocked(state: XiaoduoliUnlockState | null, roomId: string) {
  return Boolean(roomId) && Boolean(state?.unlockedRoomIds.includes(roomId))
}

export function unlockRoom(state: XiaoduoliUnlockState, roomId: string): XiaoduoliUnlockState {
  if (!roomId || state.unlockedRoomIds.includes(roomId)) return state
  return {
    initialized: true,
    unlockedRoomIds: unique([...state.unlockedRoomIds, roomId]),
  }
}

export function createUnlockEffects(seed: string) {
  const random = mulberry32(hashString(seed || 'xiaoduoli'))
  return {
    ribbons: Array.from({ length: 24 }, () => ({
      left: 8 + random() * 84,
      delay: random() * 0.18,
      duration: 1.15 + random() * 0.55,
      rotate: Math.round(-220 + random() * 440),
      color: ribbonColors[Math.floor(random() * ribbonColors.length)],
    })),
    stars: Array.from({ length: 8 }, () => ({
      left: 18 + random() * 64,
      top: 12 + random() * 28,
      delay: 0.08 + random() * 0.2,
      duration: 0.7 + random() * 0.4,
    })),
    // 纸屑从箱口迸出向下飘落（left 收在箱体范围内）
    scraps: Array.from({ length: 10 }, () => ({
      left: 30 + random() * 40,
      delay: random() * 0.22,
      duration: 0.7 + random() * 0.5,
      rotate: Math.round(-240 + random() * 480),
      drift: Math.round(-26 + random() * 52),
      size: 4 + Math.round(random() * 5),
      color: scrapColors[Math.floor(random() * scrapColors.length)],
    })),
  }
}

function unique(values: string[]) {
  return [...new Set(values)]
}

function hashString(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed: number) {
  let t = seed
  return () => {
    t += 0x6d2b79f5
    let result = Math.imul(t ^ (t >>> 15), 1 | t)
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result)
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}
