import type { RepositoryBundle } from '../repositories/contracts.js'

/** 添加好友场景对外可见的用户公开信息与当前关系状态 */
export interface FriendLookup {
  id: string
  uid: string
  displayName: string
  avatarUrl: string | null
  relation: 'self' | 'friends' | 'request_sent' | 'request_received' | 'none'
}

export function createFriendshipService(repositories: RepositoryBundle, options?: {
  notify?: (userId: string, type: string, payload: Record<string, unknown>) => void
}) {
  const notify = options?.notify ?? (() => undefined)

  // 与 sendRequest 共用一套标识解析：八位数字 UID → 旧公开码/用户名 → 邮箱 → 用户名
  const resolveUser = async (identifier: string) => {
    const trimmed = identifier.trim()
    const normalized = trimmed.toLowerCase()
    if (/^\d{1,8}$/.test(trimmed)) {
      return repositories.users.findByUid(trimmed.padStart(8, '0'))
    }
    if (/^[2-9A-HJ-NP-Z]{8}$/i.test(trimmed)) {
      const byPublicCode = await repositories.users.findByPublicCode(trimmed)
      return byPublicCode ?? repositories.users.findByUsername(normalized)
    }
    if (normalized.includes('@')) {
      return repositories.users.findByEmail(normalized)
    }
    return repositories.users.findByUsername(normalized)
  }

  const describeRelation = async (viewerId: string, otherId: string): Promise<FriendLookup['relation']> => {
    if (viewerId === otherId) return 'self'
    const relationship = await repositories.relationships.findBetweenUsers(viewerId, otherId)
    if (!relationship) return 'none'
    if (relationship.status === 'accepted') return 'friends'
    return relationship.requesterId === viewerId ? 'request_sent' : 'request_received'
  }

  return {
    async sendRequest(requesterId: string, identifier: string) {
      const addressee = await resolveUser(identifier)
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

    /** 按 UID / 旧公开码 / 用户名 / 邮箱查用户公开信息（不发好友申请），带当前关系状态 */
    async lookupUser(requesterId: string, identifier: string): Promise<FriendLookup> {
      const user = await resolveUser(identifier)
      if (!user) throw new Error('user_not_found')
      return {
        id: user.id,
        uid: user.uid,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl ?? null,
        relation: await describeRelation(requesterId, user.id)
      }
    },

    /** 推荐好友：最新注册且尚未与自己建立任何好友关系/申请的用户 */
    async listSuggestions(viewerId: string, limit = 6): Promise<Array<Omit<FriendLookup, 'relation'>>> {
      const recent = await repositories.users.listRecent(limit * 8)
      const suggestions = []
      for (const user of recent) {
        if (suggestions.length >= limit) break
        if (user.id === viewerId) continue
        if (await repositories.relationships.findBetweenUsers(viewerId, user.id)) continue
        suggestions.push({
          id: user.id,
          uid: user.uid,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl ?? null
        })
      }
      return suggestions
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
