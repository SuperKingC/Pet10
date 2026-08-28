import { describe, expect, it } from 'vitest'
import {
  XIAODUOLI_BLINK_MS,
  XIAODUOLI_DOUBLE_BLINK_MS,
  XIAODUOLI_GLANCE_MS,
  XIAODUOLI_HOP_MS,
  XIAODUOLI_IDLE_DELAY_MAX_MS,
  XIAODUOLI_IDLE_DELAY_MIN_MS,
  XIAODUOLI_LOOK_MS,
  createXiaoduoliRng,
  hashXiaoduoliSeed,
  nextXiaoduoliStep,
} from './xiaoduoliBehavior'

describe('xiaoduoli idle behavior', () => {
  it('produces the same timeline for the same seed', () => {
    const first = takeSteps(createXiaoduoliRng(hashXiaoduoliSeed('room-1')), 30)
    const second = takeSteps(createXiaoduoliRng(hashXiaoduoliSeed('room-1')), 30)

    expect(first).toEqual(second)
  })

  it('produces different timelines for different seeds', () => {
    const first = takeSteps(createXiaoduoliRng(hashXiaoduoliSeed('room-1')), 30)
    const second = takeSteps(createXiaoduoliRng(hashXiaoduoliSeed('room-2')), 30)

    expect(first).not.toEqual(second)
  })

  it('keeps every idle gap inside the configured range', () => {
    for (const step of takeSteps(createXiaoduoliRng(hashXiaoduoliSeed('range')), 300)) {
      expect(step.delayMs).toBeGreaterThanOrEqual(XIAODUOLI_IDLE_DELAY_MIN_MS)
      expect(step.delayMs).toBeLessThanOrEqual(XIAODUOLI_IDLE_DELAY_MAX_MS + 600)
    }
  })

  it('pairs each action with its own duration', () => {
    for (const step of takeSteps(createXiaoduoliRng(hashXiaoduoliSeed('duration')), 300)) {
      if (step.face === 'blink' && !step.body) expect(step.durationMs).toBe(XIAODUOLI_BLINK_MS)
      if (step.face === 'blinkTwice') expect(step.durationMs).toBe(XIAODUOLI_DOUBLE_BLINK_MS)
      if (step.face === 'glanceLeft' || step.face === 'glanceRight') {
        if (!step.body) expect(step.durationMs).toBe(XIAODUOLI_GLANCE_MS)
      }
      if (step.body === 'lookLeft' || step.body === 'lookRight') expect(step.durationMs).toBe(XIAODUOLI_LOOK_MS)
      if (step.body === 'hop') {
        expect(step.durationMs).toBe(XIAODUOLI_HOP_MS)
        expect(step.face).toBeNull()
      }
    }
  })

  it('blinks far more often than it hops so idle stays calm', () => {
    const steps = takeSteps(createXiaoduoliRng(hashXiaoduoliSeed('mix')), 600)
    const blinkFamily = steps.filter((step) => step.face === 'blink' || step.face === 'blinkTwice')
    const hops = steps.filter((step) => step.body === 'hop')

    expect(blinkFamily.length / steps.length).toBeGreaterThan(0.3)
    expect(hops.length / steps.length).toBeGreaterThan(0.02)
    expect(hops.length / steps.length).toBeLessThan(0.15)
  })

  it('hashes seeds deterministically and keeps distinct rooms apart', () => {
    expect(hashXiaoduoliSeed('invite')).toBe(hashXiaoduoliSeed('invite'))
    expect(hashXiaoduoliSeed('invite')).not.toBe(hashXiaoduoliSeed('room-9'))
  })
})

function takeSteps(random: () => number, count: number) {
  return Array.from({ length: count }, () => nextXiaoduoliStep(random))
}
