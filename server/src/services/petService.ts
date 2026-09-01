import type { Pet, PetAction } from '../domain/models.js'
import { applyPetAction } from '../domain/petRules.js'
import type { RepositoryBundle } from '../repositories/contracts.js'

export interface PetActionOutcome {
  pet: Pet
  leveledUp: boolean
  /** 本次动作实际消耗的道具 id（喂食牛奶/骨头台词分桶用；免费动作不传） */
  consumedItemId?: string | null
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
    async applyAction(roomId: string, userId: string, action: PetAction, consumedItemId?: string | null): Promise<Pet> {
      const pet = await this.getForRoom(roomId, userId)
      const next = applyPetAction(pet, action)

      const leveledUp = next.level > pet.level
      const saved = await repositories.pets.update(next)
      await repositories.petEvents.record(saved.id, userId, action)
      const outcome: PetActionOutcome = { pet: saved, leveledUp, consumedItemId }
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
