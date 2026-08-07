import type { Pet, PetAction } from './models.js'

export function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function applyPetAction(pet: Pet, action: PetAction): Pet {
  const next = { ...pet }
  if (action === 'feed') {
    next.hunger = clamp(next.hunger + 30)
    next.mood = clamp(next.mood + 5)
    next.intimacy = clamp(next.intimacy + 2)
    next.experience += 5
  }
  if (action === 'play' && next.energy >= 15) {
    next.mood = clamp(next.mood + 15)
    next.energy = clamp(next.energy - 15)
    next.intimacy = clamp(next.intimacy + 3)
    next.experience += 15
  }
  if (action === 'clean') {
    next.health = clamp(next.health + 10)
    next.mood = clamp(next.mood + 4)
    next.experience += 5
  }
  if (action === 'sleep') {
    next.energy = clamp(next.energy + 40)
    next.hunger = clamp(next.hunger - 10)
    next.mood = clamp(next.mood + 3)
  }
  if (next.experience >= next.experienceToNextLevel) {
    next.level += 1
    next.experience -= next.experienceToNextLevel
    next.experienceToNextLevel = Math.round(next.experienceToNextLevel * 1.25)
  }
  return next
}
