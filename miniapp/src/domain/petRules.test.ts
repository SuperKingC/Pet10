import { describe, expect, it } from 'vitest'
import { applyPetAction, clampPetValue } from './petRules'
import type { MockPet } from './types'

const basePet: MockPet = {
  id: 'pet-test-1',
  name: '小多利',
  hunger: 60,
  mood: 80,
  energy: 70,
  health: 90,
}

describe('miniapp pet rules', () => {
  it('keeps state values between 0 and 100', () => {
    expect(clampPetValue(-10)).toBe(0)
    expect(clampPetValue(110)).toBe(100)
  })

  it('feeding increases hunger and mood', () => {
    const result = applyPetAction(basePet, 'feed')

    expect(result.hunger).toBe(80)
    expect(result.mood).toBe(85)
    expect(result).not.toBe(basePet)
  })

  it('playing increases mood and spends energy', () => {
    const result = applyPetAction(basePet, 'play')

    expect(result.mood).toBe(100)
    expect(result.energy).toBe(55)
  })

  it('cleaning improves health and sleeping restores energy', () => {
    const cleaned = applyPetAction(basePet, 'clean')
    const rested = applyPetAction(basePet, 'sleep')

    expect(cleaned.health).toBe(100)
    expect(rested.energy).toBe(100)
  })
})
