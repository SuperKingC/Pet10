import type { RepositoryBundle } from '../repositories/contracts.js'

export type CoRaiseCandidate = {
  relationshipId: string
  roomId: string
  friend: {
    id: string
    displayName: string
    avatarUrl?: string | null
  }
  /** 已与该好友共养小多利 */
  coRaising: boolean
}

async function hasSharedPet(repositories: RepositoryBundle, userId: string): Promise<boolean> {
  const relationships = await repositories.relationships.listAcceptedForUser(userId)
  for (const relationship of relationships) {
    const room = await repositories.rooms.findByRelationshipId(relationship.id)
    if (!room) continue
    if (await repositories.pets.findByRoomId(room.id)) return true
  }
  return false
}

export function createCoRaiseService(repositories: RepositoryBundle, options?: {
  notify?: (userId: string, type: string, payload: Record<string, unknown>) => void
}) {
  const notify = options?.notify ?? (() => undefined)

  async function findFriendContext(userId: string, relationshipId: string) {
    const relationship = await repositories.relationships.findById(relationshipId)
    if (!relationship || relationship.status !== 'accepted') throw new Error('relationship_not_found')
    if (relationship.requesterId !== userId && relationship.addresseeId !== userId) throw new Error('room_forbidden')
    const friendId = relationship.requesterId === userId ? relationship.addresseeId : relationship.requesterId
    const friend = await repositories.users.findById(friendId)
    if (!friend) throw new Error('user_not_found')
    const room = await repositories.rooms.findByRelationshipId(relationshipId)
    if (!room) throw new Error('room_not_found')
    return { relationship, friend, room }
  }

  return {
    /** 可一起养小多利的好友列表（含状态标记，供选择弹窗渲染） */
    async listCandidates(userId: string): Promise<CoRaiseCandidate[]> {
      const relationships = await repositories.relationships.listAcceptedForUser(userId)
      const candidates: CoRaiseCandidate[] = []
      for (const relationship of relationships) {
        const friendId = relationship.requesterId === userId ? relationship.addresseeId : relationship.requesterId
        const friend = await repositories.users.findById(friendId)
        if (!friend) continue
        const room = await repositories.rooms.findByRelationshipId(relationship.id)
        if (!room) continue
        candidates.push({
          relationshipId: relationship.id,
          roomId: room.id,
          friend: { id: friend.id, displayName: friend.displayName, avatarUrl: friend.avatarUrl },
          coRaising: Boolean(await repositories.pets.findByRoomId(room.id))
        })
      }
      return candidates
    },

    /** 发出合养邀请：对方收到通知后在小窝确认；双方都空余时才允许 */
    async invite(userId: string, relationshipId: string) {
      const { relationship, friend, room } = await findFriendContext(userId, relationshipId)
      if (await repositories.pets.findByRoomId(room.id)) throw new Error('already_co_raising')
      if (await hasSharedPet(repositories, userId)) throw new Error('pet_quota_used')
      if (await hasSharedPet(repositories, friend.id)) throw new Error('friend_pet_quota_used')
      const inviter = await repositories.users.findById(userId)
      notify(friend.id, 'co_raise_invitation', {
        title: `${inviter?.displayName ?? '好友'}想和你一起养小多利`,
        fromUserId: userId,
        fromName: inviter?.displayName ?? '',
        relationshipId,
        roomId: room.id
      })
      return { ok: true, roomId: room.id }
    },

    /** 确认合养：任何一方已有小多利时拒绝，否则在该房间补建唯一的小多利 */
    async confirm(userId: string, relationshipId: string) {
      const { relationship, room } = await findFriendContext(userId, relationshipId)
      if (await repositories.pets.findByRoomId(room.id)) throw new Error('already_co_raising')
      const inviterId = relationship.requesterId === userId ? relationship.addresseeId : relationship.requesterId
      if (await hasSharedPet(repositories, userId)) throw new Error('pet_quota_used')
      if (await hasSharedPet(repositories, inviterId)) throw new Error('friend_pet_quota_used')
      const pet = await repositories.pets.createForRelationship(relationship.id, room.id)
      // 写入初见记忆，保持与邀请卡解锁流程一致的温馨感
      const [me, other] = await Promise.all([
        repositories.users.findById(userId),
        repositories.users.findById(inviterId)
      ])
      await repositories.memories.create({
        roomId: room.id,
        text: `小多利见证了 ${other?.displayName ?? '好友'} 和 ${me?.displayName ?? '好友'} 的初次见面，从今天起一起住在这个小窝里。`,
        canMention: true,
        category: 'relationship',
        importance: 3,
        source: 'explicit'
      })
      notify(inviterId, 'co_raise_accepted', {
        title: `${me?.displayName ?? '好友'}确认了和你一起养小多利`,
        byUserId: userId,
        byName: me?.displayName ?? '',
        roomId: room.id
      })
      return { room, pet }
    }
  }
}
