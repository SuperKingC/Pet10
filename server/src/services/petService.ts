import type { PetAction } from '../domain/models.js'
import { applyPetAction } from '../domain/petRules.js'
import type { RepositoryBundle } from '../repositories/contracts.js'

export function createPetService(repositories: RepositoryBundle) {
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
    async applyAction(roomId: string, userId: string, action: PetAction) {
      const pet = await this.getForRoom(roomId, userId)
      return repositories.pets.update(applyPetAction(pet, action))
    }
  }
}
