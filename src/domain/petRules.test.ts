import { describe, expect, it } from 'vitest'
import { applyPetAction, clampPetValue, getPetMood } from './petRules'
import type { PetState } from './types'

const basePet: PetState = {
  name: '小多利',
  level: 1,
  experience: 20,
  experienceToNextLevel: 100,
  hunger: 40,
  mood: 60,
  energy: 50,
  health: 90,
  intimacy: 18,
  moodLabel: 'hungry'
}

describe('pet rules', () => {
  it('clamps state values to the 0-100 range', () => {
    expect(clampPetValue(-4)).toBe(0)
    expect(clampPetValue(130)).toBe(100)
  })

  it('feeding improves hunger and intimacy without exceeding 100', () => {
    const result = applyPetAction(basePet, 'feed')
    expect(result.hunger).toBe(70)
    expect(result.intimacy).toBe(20)
    expect(result.moodLabel).toBe('happy')
  })

  it('playing improves mood, spends energy, and grants experience', () => {
    const result = applyPetAction(basePet, 'play')
    expect(result.mood).toBe(75)
    expect(result.energy).toBe(35)
    expect(result.experience).toBe(35)
  })

  it('sleeping restores energy and reduces hunger slightly', () => {
    const result = applyPetAction(basePet, 'sleep')
    expect(result.energy).toBe(90)
    expect(result.hunger).toBe(30)
  })

  it('derives a sleepy mood when energy is low', () => {
    expect(getPetMood({ ...basePet, energy: 10 })).toBe('sleepy')
  })
})
