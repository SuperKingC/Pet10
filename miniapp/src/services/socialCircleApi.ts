import { apiRequest } from './apiClient'

export interface MiniappFriendCandidate {
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

export interface MiniappCirclePost {
  id: string
  roomId: string
  authorType: 'user' | 'pet'
  authorId?: string | null
  authorName: string
  authorAvatarUrl: string | null
  text: string
  imageUrl?: string | null
  createdAt: string
  likes: { count: number; likedByMe: boolean }
  roomLabel: string
}

export const socialCircleApi = {
  /** 小多利圈：自己所有共养小窝的动态（好友 + 小多利），倒序 */
  listFeed() {
    return apiRequest<MiniappCirclePost[]>('/api/social/circle')
  },
  toggleLike(postId: string, liked: boolean) {
    return apiRequest<MiniappCirclePost['likes']>(`/api/social/posts/${encodeURIComponent(postId)}/like`, {
      method: liked ? 'POST' : 'DELETE'
    })
  }
}

export const friendApi = {
  /** 通过 UID / 旧公开码 / 用户名 加好友（好友申请，不含小多利） */
  sendRequest(identifier: string) {
    return apiRequest<unknown>('/api/friendships', { method: 'POST', body: { identifier } })
  },
  /** 可一起养小多利的好友列表（选择弹窗数据源） */
  listCoRaiseCandidates() {
    return apiRequest<MiniappFriendCandidate[]>('/api/co-raise/candidates')
  },
  /** 向好友发出合养邀请（对方小窝收到提示） */
  inviteCoRaise(relationshipId: string) {
    return apiRequest<{ ok: boolean }>(`/api/co-raise/relationships/${encodeURIComponent(relationshipId)}/invite`, {
      method: 'POST'
    })
  },
  /** 确认合养：创建唯一的小多利 */
  confirmCoRaise(relationshipId: string) {
    return apiRequest<{ room: { id: string } }>(`/api/co-raise/relationships/${encodeURIComponent(relationshipId)}/confirm`, {
      method: 'POST'
    })
  }
}
