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
  return {
    ...mapped,
    moodLabel: getPetMood(mapped),
    // 服务端心情引擎的推导结果（含被冷落时长）；旧后端缺省时由气泡/名片自行兜底
    moodState: pet.moodState,
    moodCaption: pet.moodCaption
  }
}
