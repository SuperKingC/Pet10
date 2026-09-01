export type MomentTopic = 'missing' | 'morning' | 'noon' | 'afternoon' | 'night' | 'memory' | 'interest'

/** 每房每天（上海自然日）自动发圈上限，含沉默帖/时段日常帖/记忆帖/兴趣帖 */
export const MOMENT_DAILY_MAX = 5
/** 两条自动帖的最小间隔（兴趣帖为保时效可豁免间隔，但同样计入日上限） */
export const MOMENT_MIN_GAP_MS = 3 * 60 * 60 * 1000
/** 主人沉默满多少小时发想念帖（优先于时段帖） */
export const MOMENT_SILENCE_HOURS = 24
/** 时段日常帖的掷骰概率 */
export const MOMENT_SLOT_CHANCE = 0.5
/** 兴趣帖：主人问了感兴趣的东西，至少隔这么久才发（等 sweep 下一轮自然延迟几分钟） */
export const MOMENT_INTEREST_DELAY_MS = 5 * 60 * 1000
/** 兴趣帖过时不候：问起超过这个时长就不再发（话题凉了） */
export const MOMENT_INTEREST_MAX_AGE_MS = 3 * 60 * 60 * 1000

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
  return !momentDailyCountReached(petPostTimes, now) && momentGapOk(petPostTimes, now)
}

/** 日上限（兴趣帖同样计入） */
export function momentDailyCountReached(petPostTimes: Date[], now: Date): boolean {
  const dayKey = shanghaiDayKey(now)
  const todayCount = petPostTimes.filter((time) => shanghaiDayKey(time) === dayKey).length
  return todayCount >= MOMENT_DAILY_MAX
}

/** 最小间隔（按最近一条宠物帖算） */
export function momentGapOk(petPostTimes: Date[], now: Date): boolean {
  const lastPostAt = petPostTimes.reduce<Date | undefined>(
    (latest, time) => (!latest || time.getTime() > latest.getTime() ? time : latest),
    undefined
  )
  return !(lastPostAt && now.getTime() - lastPostAt.getTime() < MOMENT_MIN_GAP_MS)
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

export type InterestKind = 'price' | 'travel'

const PRICE_INTEREST_PATTERN = /多少钱|价格|报价|售价|价位|预算|便宜吗|贵不贵|值得买/
const TRAVEL_INTEREST_PATTERN = /景点|旅游|游玩|去哪玩|哪儿玩|路线|行程|自由行|门票|风景/

/** 主人聊天里透出的消费/出游兴趣（确定性关键词，与 AI 无关） */
export function detectInterestQuestion(text: string): InterestKind | null {
  if (PRICE_INTEREST_PATTERN.test(text)) return 'price'
  if (TRAVEL_INTEREST_PATTERN.test(text)) return 'travel'
  return null
}

export interface InterestMomentInput {
  now: Date
  /** 最近的用户消息（正序） */
  userMessages: Array<{ text: string; createdAt: Date }>
  /** 最近宠物帖时间：问题之后若已发过帖则视为已回应，不再发 */
  petPostTimes: Date[]
}

export interface InterestDecision {
  kind: InterestKind
  /** 命中的原话（截断后），供文案引用 */
  question: string
  askedAt: Date
}

/**
 * 兴趣帖判定：最近一条「问价格/问游玩」的用户消息，问起满 5 分钟、3 小时内有效，
 * 且问题之后没发过任何宠物帖（天然去重，重启安全）→ 发一条调侃帖。
 * 兴趣帖豁免 3 小时最小间隔（时效优先），但同样计入日上限。
 */
export function pickInterestMoment(input: InterestMomentInput): InterestDecision | null {
  const { now, userMessages, petPostTimes } = input
  if (momentDailyCountReached(petPostTimes, now)) return null
  const lastPostAt = petPostTimes.reduce<Date | undefined>(
    (latest, time) => (!latest || time.getTime() > latest.getTime() ? time : latest),
    undefined
  )
  const lastPostMs = lastPostAt?.getTime() ?? Number.NEGATIVE_INFINITY
  for (let index = userMessages.length - 1; index >= 0; index--) {
    const message = userMessages[index]
    const age = now.getTime() - message.createdAt.getTime()
    if (age < MOMENT_INTEREST_DELAY_MS) continue
    if (age > MOMENT_INTEREST_MAX_AGE_MS) break
    if (message.createdAt.getTime() <= lastPostMs) return null
    const kind = detectInterestQuestion(message.text)
    if (!kind) continue
    return {
      kind,
      question: message.text.replace(/\s+/g, ' ').trim().slice(0, 30),
      askedAt: message.createdAt
    }
  }
  return null
}
