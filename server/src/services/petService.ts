import type { Pet, PetAction } from '../domain/models.js'
import { applyPetAction, clamp } from '../domain/petRules.js'
import type { RepositoryBundle } from '../repositories/contracts.js'

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

export interface PetActionOutcome {
  pet: Pet
  leveledUp: boolean
  luckyBonus: boolean
}

export function createPetService(repositories: RepositoryBundle, options?: {
  onPetEvent?: (roomId: string, userId: string, action: PetAction, outcome: PetActionOutcome) => void
}) {
  const onPetEvent = options?.onPetEvent ?? (() => undefined)

  async function assertMember(roomId: string, userId: string) {
    if (!(await repositories.rooms.isMember(roomId, userId))) throw new Error('room_forbidden')
  }

  return {
    async getForRoom(roomId: string, userId: string) {
      await assertMember(roomId, userId)
      const pet = await repositories.pets.findByRoomId(roomId)
      if (!pet) throw new Error('pet_not_found')
      return pet
    },
    async applyAction(roomId: string, userId: string, action: PetAction): Promise<Pet> {
      const pet = await this.getForRoom(roomId, userId)
      let next = applyPetAction(pet, action)

      // 今日幸运互动 buff：执行运势指定的动作额外 +5 亲密度
      let luckyBonus = false
      const fortune = await repositories.fortunes.findByRoomAndDay(roomId, todayKey())
      if (fortune && fortune.content.luckyAction === action) {
        next = { ...next, intimacy: clamp(next.intimacy + 5) }
        luckyBonus = true
      }

      const leveledUp = next.level > pet.level
      const saved = await repositories.pets.update(next)
      await repositories.petEvents.record(saved.id, userId, action, { luckyBonus })
      const outcome: PetActionOutcome = { pet: saved, leveledUp, luckyBonus }
      onPetEvent(roomId, userId, action, outcome)
      return saved
    },
    async contributions(roomId: string, userId: string) {
      await assertMember(roomId, userId)
      const pet = await repositories.pets.findByRoomId(roomId)
      if (!pet) throw new Error('pet_not_found')
      return repositories.petEvents.statsByRoom(pet.id)
    }
  }
}
