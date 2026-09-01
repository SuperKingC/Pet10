export type MomentTopic = 'missing' | 'morning' | 'noon' | 'afternoon' | 'night' | 'memory'

/** 每房每天（上海自然日）自动发圈上限，含沉默帖/时段日常帖/记忆帖 */
export const MOMENT_DAILY_MAX = 4
/** 两条自动帖的最小间隔 */
export const MOMENT_MIN_GAP_MS = 3 * 60 * 60 * 1000
/** 主人沉默满多少小时发想念帖（优先于时段帖） */
export const MOMENT_SILENCE_HOURS = 24
/** 时段日常帖的掷骰概率 */
export const MOMENT_SLOT_CHANCE = 0.5

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000

/** 上海时区的小时（0-23） */
export function shanghaiHour(date: Date): number {
  return new Date(date.getTime() + SHANGHAI_OFFSET_MS).getUTCHours()
}

/** 上海时区的自然日 key（YYYY-MM-DD） */
export function shanghaiDayKey(date: Date): string {
  const local = new Date(date.getTime() + SHANGHAI_OFFSET_MS)
  const month = String(local.getUTCMonth() + 1).padStart(2, '0')
  const day = String(local.getUTCDate()).padStart(2, '0')
  return `${local.getUTCFullYear()}-${month}-${day}`
}

/** 生活时段档：像真人一样在固定生活节点刷存在感（上海时区，to 不含） */
const MOMENT_SLOTS: Array<{ topic: MomentTopic; from: number; to: number }> = [
  { topic: 'morning', from: 7, to: 10 },
  { topic: 'noon', from: 11, to: 14 },
  { topic: 'afternoon', from: 15, to: 18 },
  { topic: 'night', from: 21, to: 24 }
]

/** 统一节流判定：日上限 + 最小间隔（不含概率） */
export function canPostMoment(petPostTimes: Date[], now: Date): boolean {
  const dayKey = shanghaiDayKey(now)
  const todayCount = petPostTimes.filter((time) => shanghaiDayKey(time) === dayKey).length
  if (todayCount >= MOMENT_DAILY_MAX) return false
  const lastPostAt = petPostTimes.reduce<Date | undefined>(
    (latest, time) => (!latest || time.getTime() > latest.getTime() ? time : latest),
    undefined
  )
  if (lastPostAt && now.getTime() - lastPostAt.getTime() < MOMENT_MIN_GAP_MS) return false
  return true
}

export interface MomentDecisionInput {
  now: Date
  /** 房间内最近的宠物帖时间 */
  petPostTimes: Date[]
  /** 主人沉默小时数（最近一条用户消息起算） */
  userSilenceHours: number
  /** 0-1，缺省 Math.random */
  random?: number
}

/**
 * 发圈触发判定（纯函数）：
 * 1. 节流不过 → null；
 * 2. 主人沉默满阈值 → 想念帖（不受时段限制）；
 * 3. 处于生活时段且该档今天没发过 → 掷骰发一条时段日常帖；
 * 4. 否则不发。
 */
export function pickMomentTopic(input: MomentDecisionInput): MomentTopic | null {
  const { now, petPostTimes, userSilenceHours } = input
  const random = input.random ?? Math.random()
  if (!canPostMoment(petPostTimes, now)) return null
  if (userSilenceHours >= MOMENT_SILENCE_HOURS) return 'missing'
  const hour = shanghaiHour(now)
  const slot = MOMENT_SLOTS.find((candidate) => hour >= candidate.from && hour < candidate.to)
  if (!slot) return null
  const dayKey = shanghaiDayKey(now)
  const slotPosted = petPostTimes.some((time) =>
    shanghaiDayKey(time) === dayKey && shanghaiHour(time) >= slot.from && shanghaiHour(time) < slot.to
  )
  if (slotPosted) return null
  return random < MOMENT_SLOT_CHANCE ? slot.topic : null
}
