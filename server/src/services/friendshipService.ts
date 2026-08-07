import type { RepositoryBundle } from '../repositories/contracts.js'

export function createFriendshipService(repositories: RepositoryBundle) {
  return {
    async sendRequest(requesterId: string, identifier: string) {
      const normalized = identifier.trim().toLowerCase()
      const addressee = normalized.includes('@')
        ? await repositories.users.findByEmail(normalized)
        : await repositories.users.findByUsername(normalized)
      if (!addressee) throw new Error('user_not_found')
      if (addressee.id === requesterId) throw new Error('cannot_add_self')
      if (await repositories.relationships.findActiveForUser(requesterId)) {
        throw new Error('friend_limit_reached')
      }
      if (await repositories.relationships.findBetweenUsers(requesterId, addressee.id)) {
        throw new Error('relationship_already_exists')
      }
      return repositories.relationships.create(requesterId, addressee.id)
    },

    async acceptRequest(userId: string, relationshipId: string) {
      const relationship = await repositories.relationships.findById(relationshipId)
      if (!relationship || relationship.addresseeId !== userId) throw new Error('relationship_not_found')
      const existingRelationship = await repositories.relationships.findActiveForUser(userId)
      if (existingRelationship && existingRelationship.id !== relationshipId) throw new Error('friend_limit_reached')
      const accepted = await repositories.relationships.accept(relationshipId)
      const room = await repositories.rooms.createForRelationship(accepted.id)
      await repositories.pets.createForRelationship(accepted.id, room.id)
      return accepted
    }
  }
}
