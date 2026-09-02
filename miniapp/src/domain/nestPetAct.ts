import type { PetAction } from './types'

/** 小窝行为幕：站姿 / 睡觉 / 闲逛（走来走去）/ 叼娃娃 */
export type NestPetAct = 'stand' | 'sleep' | 'wander' | 'fetch'

export type NestPetActState = { act: NestPetAct; wakeAt: number }

/** 睡觉动作后的入睡时长：够看完一轮交叉淡入 + 呼吸 + Zzz，醒来不突兀 */
export const NEST_PET_SLEEP_MS = 20000
/** 叼娃娃分镜总时长（与 pet-fetch 系列动画秒数保持一致；11s = 出画往返横穿 + 回中庆祝） */
export const NEST_PET_FETCH_MS = 11000
/** 闲逛单次时长：出发去右侧、转身、走回中心一趟（与 pet-wander 动画秒数保持一致） */
export const NEST_PET_WANDER_MS = 7000
/** 闲逛调度间隔：站立时随机等待后出发一趟 */
export const NEST_PET_WANDER_DELAY_MIN_MS = 24000
export const NEST_PET_WANDER_DELAY_MAX_MS = 54000

export const NEST_PET_STAND_ACT: NestPetActState = { act: 'stand', wakeAt: 0 }

/**
 * 照顾动作驱动的小窝行为幕（纯函数）：点睡觉入睡；点玩耍立即出发叼娃娃（奖励时刻，睡觉中也会跳起来去叼）；
 * 喂食/清洁把睡着的小多利叫醒，但不打断正在闲逛/叼娃的行进（让分镜演完）；时长由组件侧定时器回收。
 */
export function reduceNestPetAct(
  state: NestPetActState,
  event: { action: PetAction; now: number },
): NestPetActState {
  if (event.action === 'sleep') return { act: 'sleep', wakeAt: event.now + NEST_PET_SLEEP_MS }
  if (event.action === 'play') return { act: 'fetch', wakeAt: event.now + NEST_PET_FETCH_MS }
  if (state.act === 'sleep') return NEST_PET_STAND_ACT
  return state
}

/** 闲逛调度：站立时随机等待 24~54s 出发一趟（注入 random 便于测试） */
export function nextWanderDelayMs(random: () => number): number {
  return Math.round(
    NEST_PET_WANDER_DELAY_MIN_MS + random() * (NEST_PET_WANDER_DELAY_MAX_MS - NEST_PET_WANDER_DELAY_MIN_MS),
  )
}
