import type { Relationship, User } from '../domain/models.js'
import { resolveLaunchEntry, type LaunchContext } from '../domain/launchContext.js'
import type { RepositoryBundle, UserProfilePatch } from '../repositories/contracts.js'

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

export function createSessionService(repositories: RepositoryBundle, options?: {
  emitUser?: (userId: string, event: string, payload: unknown) => void
  getInvitation?: (token: string) => Promise<LaunchContext['pendingInvitations'][number]>
}) {
  const emitUser = options?.emitUser ?? (() => undefined)
  const getInvitation = options?.getInvitation
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
    async getLaunchContext(userId: string, options?: {
      activeRoomId?: string
      assetVersion?: string
      invitationToken?: string
    }): Promise<LaunchContext> {
      const user = await repositories.users.findById(userId)
      if (!user) throw new Error('user_not_found')

      const relationships = await repositories.relationships.listAcceptedForUser(userId)
      const rooms = []
      for (const relationship of relationships) {
        const room = await repositories.rooms.findByRelationshipId(relationship.id)
        if (!room) continue
        const friendId = relationship.requesterId === userId ? relationship.addresseeId : relationship.requesterId
        const friend = await repositories.users.findById(friendId)
        const pet = await repositories.pets.findByRoomId(room.id)
        if (!friend || !pet) continue
        rooms.push({
          id: room.id,
          partner: {
            id: friend.id,
            displayName: friend.displayName,
            avatarUrl: friend.avatarUrl
          },
          pet: {
            id: pet.id,
            name: pet.name,
            level: pet.level,
            updatedAt: pet.updatedAt.toISOString()
          },
          lastUsedAt: null,
          unreadCount: 0
        })
      }

      const activeRoomId = options?.activeRoomId && rooms.some((room) => room.id === options.activeRoomId)
        ? options.activeRoomId
        : rooms[0]?.id
      const pendingInvitations = options?.invitationToken && getInvitation
        ? [await getInvitation(options.invitationToken)]
        : []
      return {
        user: {
          id: user.id,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl
        },
        rooms,
        pendingInvitations,
        activeRoomId,
        entry: resolveLaunchEntry({
          hasValidInvitation: pendingInvitations.length > 0,
          hasRooms: rooms.length > 0,
          hasPendingInvitations: pendingInvitations.length > 0,
          activeRoomId
        }),
        assetVersion: options?.assetVersion ?? 'local'
      }
    },
    async updateUsername(userId: string, username: string) {
      const normalized = username.trim().toLowerCase()
      if (!/^[a-z0-9_]{3,24}$/.test(normalized)) throw new Error('invalid_username')
      const existing = await repositories.users.findByUsername(normalized)
      if (existing && existing.id !== userId) throw new Error('username_already_exists')
      return repositories.users.updateUsername(userId, normalized)
    },
    async updateProfile(userId: string, patch: UserProfilePatch) {
      if (patch.birthday !== undefined && patch.birthday !== null && Number.isNaN(Date.parse(patch.birthday))) {
        throw new Error('invalid_birthday')
      }
      if (patch.mbti !== undefined && patch.mbti !== null && !/^[IE][SN][TF][JP]$/.test(patch.mbti)) {
        throw new Error('invalid_mbti')
      }
      if (patch.gender !== undefined && !['female', 'male', 'private'].includes(patch.gender)) {
        throw new Error('invalid_gender')
      }
      if (patch.displayName !== undefined && patch.displayName !== null) {
        const trimmed = patch.displayName.trim()
        if (trimmed.length < 2 || trimmed.length > 12) throw new Error('invalid_display_name')
        patch = { ...patch, displayName: trimmed }
      }
      const updated = await repositories.users.updateProfile(userId, patch)
      // 昵称/头像变化后通知已接受的好友，保证双端即时同步
      const relationship = await repositories.relationships.findActiveForUser(userId)
      if (relationship && relationship.status === 'accepted') {
        const friendId = relationship.requesterId === userId ? relationship.addresseeId : relationship.requesterId
        emitUser(friendId, 'profile.updated', { userId, user: updated })
      }
      return updated
    }
  }
}
