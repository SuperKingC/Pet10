import { describe, expect, it } from 'vitest'
import {
  NEST_PET_FETCH_MS,
  NEST_PET_LIE_DELAY_MAX_MS,
  NEST_PET_LIE_DELAY_MIN_MS,
  NEST_PET_LIE_MS,
  NEST_PET_SLEEP_MS,
  NEST_PET_STAND_ACT,
  NEST_PET_WANDER_DELAY_MAX_MS,
  NEST_PET_WANDER_DELAY_MIN_MS,
  nextLieDelayMs,
  nextWanderDelayMs,
  reduceNestPetAct,
} from './nestPetAct'

describe('reduceNestPetAct', () => {
  it('睡觉动作让小多利入睡并记录醒来时刻', () => {
    const next = reduceNestPetAct(NEST_PET_STAND_ACT, { action: 'sleep', now: 1000 })
    expect(next).toEqual({ act: 'sleep', wakeAt: 1000 + NEST_PET_SLEEP_MS })
  })

  it('睡着时重复点睡觉刷新醒来时刻', () => {
    const asleep = reduceNestPetAct(NEST_PET_STAND_ACT, { action: 'sleep', now: 1000 })
    const next = reduceNestPetAct(asleep, { action: 'sleep', now: 5000 })
    expect(next).toEqual({ act: 'sleep', wakeAt: 5000 + NEST_PET_SLEEP_MS })
  })

  it('玩耍动作立即出发叼娃娃，睡觉中也会跳起来去叼', () => {
    expect(reduceNestPetAct(NEST_PET_STAND_ACT, { action: 'play', now: 1000 }))
      .toEqual({ act: 'fetch', wakeAt: 1000 + NEST_PET_FETCH_MS })
    const asleep = reduceNestPetAct(NEST_PET_STAND_ACT, { action: 'sleep', now: 1000 })
    expect(reduceNestPetAct(asleep, { action: 'play', now: 2000 }))
      .toEqual({ act: 'fetch', wakeAt: 2000 + NEST_PET_FETCH_MS })
  })

  it('喂食/清洁把睡着的小多利叫醒', () => {
    const asleep = reduceNestPetAct(NEST_PET_STAND_ACT, { action: 'sleep', now: 1000 })
    for (const action of ['feed', 'clean'] as const) {
      expect(reduceNestPetAct(asleep, { action, now: 2000 })).toEqual({ act: 'stand', wakeAt: 0 })
    }
  })

  it('喂食/清洁不打断闲逛和叼娃的行进，玩耍可打断闲逛改去叼娃', () => {
    const wandering = { act: 'wander' as const, wakeAt: 9000 }
    expect(reduceNestPetAct(wandering, { action: 'feed', now: 3000 })).toEqual(wandering)
    expect(reduceNestPetAct(wandering, { action: 'clean', now: 3000 })).toEqual(wandering)
    expect(reduceNestPetAct(wandering, { action: 'play', now: 3000 }))
      .toEqual({ act: 'fetch', wakeAt: 3000 + NEST_PET_FETCH_MS })
    const fetching = { act: 'fetch' as const, wakeAt: 9000 }
    expect(reduceNestPetAct(fetching, { action: 'feed', now: 3000 })).toEqual(fetching)
  })

  it('站立状态下的喂食/清洁维持原状', () => {
    for (const action of ['feed', 'clean'] as const) {
      expect(reduceNestPetAct(NEST_PET_STAND_ACT, { action, now: 1000 })).toEqual(NEST_PET_STAND_ACT)
    }
  })
})

describe('nextWanderDelayMs', () => {
  it('在配置的延迟区间内取值', () => {
    expect(nextWanderDelayMs(() => 0)).toBe(NEST_PET_WANDER_DELAY_MIN_MS)
    expect(nextWanderDelayMs(() => 0.999999)).toBeLessThanOrEqual(NEST_PET_WANDER_DELAY_MAX_MS)
    expect(nextWanderDelayMs(() => 0.5)).toBe(
      Math.round(NEST_PET_WANDER_DELAY_MIN_MS + 0.5 * (NEST_PET_WANDER_DELAY_MAX_MS - NEST_PET_WANDER_DELAY_MIN_MS)),
    )
  })
})

describe('nextLieDelayMs', () => {
  it('在配置的延迟区间内取值', () => {
    expect(nextLieDelayMs(() => 0)).toBe(NEST_PET_LIE_DELAY_MIN_MS)
    expect(nextLieDelayMs(() => 0.999999)).toBeLessThanOrEqual(NEST_PET_LIE_DELAY_MAX_MS)
    expect(nextLieDelayMs(() => 0.5)).toBe(
      Math.round(NEST_PET_LIE_DELAY_MIN_MS + 0.5 * (NEST_PET_LIE_DELAY_MAX_MS - NEST_PET_LIE_DELAY_MIN_MS)),
    )
  })
})
