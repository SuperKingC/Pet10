import { apiRequest } from './apiClient'

export interface MiniappFortune {
  id: string
  day: string
  content: {
    zodiac: string
    overall: { rating: number; summary: string; text?: string }
    love?: { rating: number; single?: string; partnered: string }
    study?: { rating: number; text: string }
    work?: { rating: number; text: string }
    wealth?: { rating: number; text: string }
    health?: { rating: number; text: string }
    luckyColor: { name: string; hex: string }
    luckyNumber: number
  }
}

export interface MiniappNotification {
  id: string
  type: string
  read: boolean
  createdAt: string
  payload: Record<string, unknown>
}

export interface MiniappCodeword {
  day: string
  question: string
  myAnswer: string | null
  partnerAnswer: string | null
  answeredCount: number
}

export interface MiniappConversation {
  roomId: string
  type: 'pair' | 'pet_dm'
  title: string
  avatarUrl: string | null
  proactiveEnabled: boolean
  /** pair 会话带好友资料（昵称/头像），pet_dm 无此字段 */
  friend?: {
    id: string
    displayName: string
    avatarUrl?: string | null
  }
  latestMessage?: {
    id: string
    senderType: 'user' | 'pet'
    senderId?: string
    text: string
    kind: 'text' | 'image' | 'pet'
    createdAt: string
  }
  updatedAt: string
}

export type AnniversaryRepeat = 'yearly' | 'none'

export interface MiniappAnniversary {
  id: string
  roomId: string
  userId: string
  name: string
  icon: string
  note: string
  day: string
  repeatRule: AnniversaryRepeat
  photo?: string | null
  createdAt: string
  updatedAt: string
}

export type AnniversaryInput = {
  name: string
  icon: string
  note: string
  day: string
  repeatRule: AnniversaryRepeat
  photo?: string | null
}

export interface MiniappContribution {
  userId: string
  action: string
  count: number
}

export interface MiniappProfile {
  id: string
  displayName: string
  avatarUrl?: string | null
  avatarConfig?: string | null
  birthday?: string | null
  mbti?: string | null
  gender?: 'female' | 'male' | 'private'
}

export const socialApi = {
  async getProfile() {
    const session = await apiRequest<{ user: MiniappProfile }>('/api/session')
    return session.user
  },
  listConversations() {
    return apiRequest<MiniappConversation[]>('/api/social/conversations')
  },
  getFortune() {
    return apiRequest<MiniappFortune>('/api/social/fortune/today')
  },
  listNotifications() {
    return apiRequest<{ items: MiniappNotification[]; unread: number }>('/api/social/notifications')
  },
  markNotificationsRead() {
    return apiRequest<{ unread: number }>('/api/social/notifications/read-all', {
      method: 'POST',
    })
  },
  updateProfile(patch: {
    displayName?: string
    birthday?: string | null
    mbti?: string | null
    avatarConfig?: string | null
    avatarUrl?: string | null
    gender?: MiniappProfile['gender']
  }) {
    return apiRequest<MiniappProfile>('/api/session/profile', {
      method: 'PATCH',
      body: patch,
    })
  },
  getCodeword(roomId: string) {
    return apiRequest<MiniappCodeword>(`/api/social/rooms/${encodeURIComponent(roomId)}/codeword`)
  },
  answerCodeword(roomId: string, answer: string) {
    return apiRequest<MiniappCodeword>(`/api/social/rooms/${encodeURIComponent(roomId)}/codeword`, {
      method: 'PUT',
      body: { answer },
    })
  },
  listContributions(roomId: string) {
    return apiRequest<MiniappContribution[]>(`/api/social/rooms/${encodeURIComponent(roomId)}/contributions`)
  },
  listAnniversaries(roomId: string) {
    return apiRequest<MiniappAnniversary[]>(`/api/social/rooms/${encodeURIComponent(roomId)}/anniversaries`)
  },
  createAnniversary(roomId: string, input: AnniversaryInput) {
    return apiRequest<MiniappAnniversary>(`/api/social/rooms/${encodeURIComponent(roomId)}/anniversaries`, {
      method: 'POST',
      body: input,
    })
  },
  updateAnniversary(roomId: string, anniversaryId: string, patch: Partial<AnniversaryInput>) {
    return apiRequest<MiniappAnniversary>(`/api/social/rooms/${encodeURIComponent(roomId)}/anniversaries/${encodeURIComponent(anniversaryId)}`, {
      method: 'PUT',
      body: patch,
    })
  },
  deleteAnniversary(roomId: string, anniversaryId: string) {
    return apiRequest<{ ok: boolean }>(`/api/social/rooms/${encodeURIComponent(roomId)}/anniversaries/${encodeURIComponent(anniversaryId)}`, {
      method: 'DELETE',
    })
  },
}
