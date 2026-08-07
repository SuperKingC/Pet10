import type { PetMood, PetState } from './types'

export type PetAction = 'feed' | 'play' | 'clean' | 'sleep'

export function clampPetValue(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function getPetMood(pet: PetState): PetMood {
  if (pet.energy < 25) return 'sleepy'
  if (pet.hunger < 35) return 'hungry'
  if (pet.intimacy > 65 && pet.mood > 70) return 'clingy'
  return 'happy'
}

export function applyPetAction(pet: PetState, action: PetAction): PetState {
  const next = { ...pet }
  if (action === 'feed') {
    next.hunger = clampPetValue(next.hunger + 30)
    next.mood = clampPetValue(next.mood + 5)
    next.intimacy = clampPetValue(next.intimacy + 2)
    next.experience += 5
  }
  if (action === 'play' && next.energy >= 15) {
    next.mood = clampPetValue(next.mood + 15)
    next.energy = clampPetValue(next.energy - 15)
    next.intimacy = clampPetValue(next.intimacy + 3)
    next.experience += 15
  }
  if (action === 'clean') {
    next.health = clampPetValue(next.health + 10)
    next.mood = clampPetValue(next.mood + 4)
    next.experience += 5
  }
  if (action === 'sleep') {
    next.energy = clampPetValue(next.energy + 40)
    next.hunger = clampPetValue(next.hunger - 10)
    next.mood = clampPetValue(next.mood + 3)
  }
  if (next.experience >= next.experienceToNextLevel) {
    next.level += 1
    next.experience -= next.experienceToNextLevel
    next.experienceToNextLevel = Math.round(next.experienceToNextLevel * 1.25)
  }
  next.moodLabel = getPetMood(next)
  return next
}
