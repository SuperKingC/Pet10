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
      if (/^\d{1,8}$/.test(trimmed)) {
        // 八位数字 UID 精确匹配
        addressee = await repositories.users.findByUid(trimmed.padStart(8, '0'))
      } else if (/^[2-9A-HJ-NP-Z]{8}$/i.test(trimmed)) {
        // 兼容旧公开码：依次按 公开码 → username 解析
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
      notify(addressee.id, 'friend_request', {
        fromUserId: requesterId,
        fromName: requester?.displayName ?? '',
        fromUid: requester?.uid ?? ''
      })
      return relationship
    },

    async acceptRequest(userId: string, relationshipId: string) {
      const relationship = await repositories.relationships.findById(relationshipId)
      if (!relationship || relationship.addresseeId !== userId) throw new Error('relationship_not_found')
      // 加好友只建立关系与聊天房间；小多利只能与唯一好友共养，需对方在小窝另发合养邀请并确认后才创建
      const accepted = await repositories.relationships.accept(relationshipId)
      await repositories.rooms.createForRelationship(accepted.id)
      const accepter = await repositories.users.findById(userId)
      notify(accepted.requesterId, 'friend_accepted', { byUserId: userId, byName: accepter?.displayName ?? '' })
      return accepted
    },

    async listPending(userId: string) {
      return repositories.relationships.listPendingForUser(userId)
    }
  }
}
