import { describe, expect, it } from 'vitest'
import {
  advancePressProgress,
  animationMatches,
  createTarotAnimationRun,
  tarotMotionDuration
} from './tarotAnimation'

describe('tarot animation contract', () => {
  it('advances held shuffle progress by elapsed time and clamps it to one hundred', () => {
    expect(advancePressProgress(25, 500)).toBe(61)
    expect(advancePressProgress(95, 500)).toBe(100)
    expect(advancePressProgress(20, -10)).toBe(20)
  })

  it('accepts completion only from the active animation name and token', () => {
    const run = createTarotAnimationRun('pick-card', 7)

    expect(animationMatches(run, 'pick-card', 7)).toBe(true)
    expect(animationMatches(run, 'pick-card', 6)).toBe(false)
    expect(animationMatches(run, 'cut-upper', 7)).toBe(false)
    expect(animationMatches(undefined, 'pick-card', 7)).toBe(false)
  })

  it('uses an immediate completion duration when reduced motion is requested', () => {
    expect(tarotMotionDuration('cut-upper', false)).toBe(1150)
    expect(tarotMotionDuration('cut-upper', true)).toBe(0)
  })
})
