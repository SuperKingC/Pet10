import type { RepositoryBundle } from '../repositories/contracts.js'

export function createFriendshipService(repositories: RepositoryBundle, options?: {
  notify?: (userId: string, type: string, payload: Record<string, unknown>) => void
}) {
  const notify = options?.notify ?? (() => undefined)

  return {
    async sendRequest(requesterId: string, identifier: string) {
      const trimmed = identifier.trim()
      const normalized = trimmed.toLowerCase()
      let addressee: Awaited<ReturnType<RepositoryBundle['users']['findById']>>
      if (/^[2-9A-HJ-NP-Z]{8}$/i.test(trimmed)) {
        // 依次按 公开码 → username → email 解析
        addressee = await repositories.users.findByPublicCode(trimmed)
        if (!addressee) addressee = await repositories.users.findByUsername(normalized)
      } else if (normalized.includes('@')) {
        addressee = await repositories.users.findByEmail(normalized)
      } else {
        addressee = await repositories.users.findByUsername(normalized)
      }
      if (!addressee) throw new Error('user_not_found')
      if (addressee.id === requesterId) throw new Error('cannot_add_self')
      if (await repositories.relationships.findBetweenUsers(requesterId, addressee.id)) {
        throw new Error('relationship_already_exists')
      }
      const relationship = await repositories.relationships.create(requesterId, addressee.id)
      const requester = await repositories.users.findById(requesterId)
      notify(addressee.id, 'friend_request', { fromUserId: requesterId, fromName: requester?.displayName ?? '' })
      return relationship
    },

    async acceptRequest(userId: string, relationshipId: string) {
      const relationship = await repositories.relationships.findById(relationshipId)
      if (!relationship || relationship.addresseeId !== userId) throw new Error('relationship_not_found')
      const accepted = await repositories.relationships.accept(relationshipId)
      const room = await repositories.rooms.createForRelationship(accepted.id)
      await repositories.pets.createForRelationship(accepted.id, room.id)
      const accepter = await repositories.users.findById(userId)
      notify(accepted.requesterId, 'friend_accepted', { byUserId: userId, byName: accepter?.displayName ?? '' })
      return accepted
    },

    async listPending(userId: string) {
      return repositories.relationships.listPendingForUser(userId)
    }
  }
}
