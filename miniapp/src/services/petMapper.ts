import type { PetState } from '../domain/types'
import { getPetMood } from '../domain/petRules'
import type { ServerPet } from './petApi'

export function mapRoomPet(pet: ServerPet): PetState {
  const mapped = {
    id: pet.id,
    name: pet.name,
    level: pet.level,
    experience: pet.experience,
    experienceToNextLevel: pet.experienceToNextLevel,
    hunger: pet.hunger,
    mood: pet.mood,
    energy: pet.energy,
    health: pet.health,
    intimacy: pet.intimacy,
    moodLabel: 'happy' as const
  }
  return { ...mapped, moodLabel: getPetMood(mapped) }
}
