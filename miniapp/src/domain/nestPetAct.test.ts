import { describe, expect, it } from 'vitest'
import { NEST_PET_SLEEP_MS, NEST_PET_STAND_ACT, reduceNestPetAct } from './nestPetAct'

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

  it('其余照顾动作把睡着的小多利叫醒', () => {
    const asleep = reduceNestPetAct(NEST_PET_STAND_ACT, { action: 'sleep', now: 1000 })
    for (const action of ['feed', 'play', 'clean'] as const) {
      expect(reduceNestPetAct(asleep, { action, now: 2000 })).toEqual({ act: 'stand', wakeAt: 0 })
    }
  })

  it('站立状态下的非睡觉动作维持原状', () => {
    for (const action of ['feed', 'play', 'clean'] as const) {
      expect(reduceNestPetAct(NEST_PET_STAND_ACT, { action, now: 1000 })).toEqual(NEST_PET_STAND_ACT)
    }
  })
})
