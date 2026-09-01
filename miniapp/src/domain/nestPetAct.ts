import type { PetAction } from './types'

/** 小窝行为幕：站姿 / 四脚朝天睡觉（后续扩展闲逛、叼娃娃等幕） */
export type NestPetAct = 'stand' | 'sleep'

export type NestPetActState = { act: NestPetAct; wakeAt: number }

/** 睡觉动作后的入睡时长：够看完一轮交叉淡入 + 呼吸 + Zzz，醒来不突兀 */
export const NEST_PET_SLEEP_MS = 20000

export const NEST_PET_STAND_ACT: NestPetActState = { act: 'stand', wakeAt: 0 }

/**
 * 照顾动作驱动的小窝行为幕（纯函数）：点睡觉入睡 NEST_PET_SLEEP_MS（睡着时重复点刷新时长），
 * 其余照顾动作把睡着的小多利叫醒；站立时非睡觉动作维持原状。时长由组件侧定时器回收。
 */
export function reduceNestPetAct(
  state: NestPetActState,
  event: { action: PetAction; now: number },
): NestPetActState {
  if (event.action === 'sleep') return { act: 'sleep', wakeAt: event.now + NEST_PET_SLEEP_MS }
  if (state.act === 'sleep') return { act: 'stand', wakeAt: 0 }
  return state
}
