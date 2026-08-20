import type { MockPet, PetAction, PetMood } from './types'

export function getPetMood(pet: Pick<MockPet, 'energy' | 'hunger' | 'mood'> & { intimacy?: number }): PetMood {
  if (pet.energy < 25) return 'sleepy'
  if (pet.hunger < 35) return 'hungry'
  if ((pet.intimacy ?? 0) > 65 && pet.mood > 70) return 'clingy'
  return 'happy'
}

export function clampPetValue(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function applyPetAction(pet: MockPet, action: PetAction): MockPet {
  const next = { ...pet }

  if (action === 'feed') {
    next.hunger = clampPetValue(next.hunger + 20)
    next.mood = clampPetValue(next.mood + 5)
  }

  if (action === 'play' && next.energy >= 15) {
    next.mood = clampPetValue(next.mood + 20)
    next.energy = clampPetValue(next.energy - 15)
  }

  if (action === 'clean') {
    next.health = clampPetValue(next.health + 10)
    next.mood = clampPetValue(next.mood + 5)
  }

  if (action === 'sleep') {
    next.energy = clampPetValue(next.energy + 30)
    next.hunger = clampPetValue(next.hunger - 10)
  }

  return next
}
