import type { Relationship, User } from '../domain/models.js'
import type { RepositoryBundle } from '../repositories/contracts.js'

export type HomeSession =
  | { status: 'unbound'; user: User }
  | { status: 'pending_outgoing'; user: User; relationship: Relationship; friend: User }
  | { status: 'pending_incoming'; user: User; relationship: Relationship; friend: User }
  | {
      status: 'accepted'
      user: User
      relationship: Relationship
      friend: User
      room: NonNullable<Awaited<ReturnType<RepositoryBundle['rooms']['findByRelationshipId']>>>
      pet: NonNullable<Awaited<ReturnType<RepositoryBundle['pets']['findByRoomId']>>>
      messages: Awaited<ReturnType<RepositoryBundle['messages']['listRecent']>>
      memories: Awaited<ReturnType<RepositoryBundle['memories']['listByRoom']>>
    }

export function createSessionService(repositories: RepositoryBundle) {
  return {
    async getHome(userId: string): Promise<HomeSession> {
      const user = await repositories.users.findById(userId)
      if (!user) throw new Error('user_not_found')
      const relationship = await repositories.relationships.findActiveForUser(userId)
      if (!relationship) return { status: 'unbound', user }
      const friendId = relationship.requesterId === userId ? relationship.addresseeId : relationship.requesterId
      const friend = await repositories.users.findById(friendId)
      if (!friend) throw new Error('user_not_found')
      if (relationship.status === 'pending') {
        return {
          status: relationship.requesterId === userId ? 'pending_outgoing' : 'pending_incoming',
          user,
          relationship,
          friend
        }
      }
      const room = await repositories.rooms.findByRelationshipId(relationship.id)
      if (!room) throw new Error('room_not_found')
      const pet = await repositories.pets.findByRoomId(room.id)
      if (!pet) throw new Error('pet_not_found')
      return {
        status: 'accepted',
        user,
        relationship,
        friend,
        room,
        pet,
        messages: await repositories.messages.listRecent(room.id, 50),
        memories: await repositories.memories.listByRoom(room.id)
      }
    },
    async updateUsername(userId: string, username: string) {
      const normalized = username.trim().toLowerCase()
      if (!/^[a-z0-9_]{3,24}$/.test(normalized)) throw new Error('invalid_username')
      const existing = await repositories.users.findByUsername(normalized)
      if (existing && existing.id !== userId) throw new Error('username_already_exists')
      return repositories.users.updateUsername(userId, normalized)
    },
    async updateProfile(userId: string, patch: { avatarUrl?: string; birthday?: string | null; mbti?: string | null }) {
      if (patch.birthday !== undefined && patch.birthday !== null && Number.isNaN(Date.parse(patch.birthday))) {
        throw new Error('invalid_birthday')
      }
      if (patch.mbti !== undefined && patch.mbti !== null && !/^[IE][SN][TF][JP]$/.test(patch.mbti)) {
        throw new Error('invalid_mbti')
      }
      return repositories.users.updateProfile(userId, patch)
    }
  }
}
