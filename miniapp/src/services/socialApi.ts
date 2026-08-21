import { apiRequest } from './apiClient'

export interface MiniappMood {
  id: string
  roomId: string
  userId: string
  day: string
  level: number
  updatedAt: string
}

export interface MiniappFortune {
  id: string
  day: string
  content: {
    zodiac: string
    overall: { rating: number; summary: string }
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

export const socialApi = {
  listMoods(roomId: string, from: string, to: string) {
    return apiRequest<MiniappMood[]>(`/api/social/rooms/${encodeURIComponent(roomId)}/moods?from=${from}&to=${to}`)
  },
  setMood(roomId: string, level: number) {
    return apiRequest<MiniappMood>(`/api/social/rooms/${encodeURIComponent(roomId)}/moods`, {
      method: 'PUT',
      body: { level },
    })
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
  updateProfile(patch: { displayName?: string; birthday?: string | null }) {
    return apiRequest<{ displayName: string; birthday?: string | null }>('/api/session/profile', {
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
}
