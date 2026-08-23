import { apiRequest } from './httpClient'
import { runtimeConfig } from './runtimeConfig'
import { getPetMood } from '../domain/petRules'
import type {
  AppNotification,
  CodewordState,
  Conversation,
  ContributionStat,
  Fortune,
  MapLight,
  Message,
  MoodEntry,
  PetMemory,
  PetState,
  Post,
  RoomBootstrap,
  UserProfile
} from '../domain/types'
import { mapServerMessage, type ServerMessage } from './messageMapper'
import { mockSocialApi } from './mock/mockSocialApi'

/** 服务端宠物数据补齐前端派生字段 */
export function normalizePet(pet: Omit<PetState, 'moodLabel'> | PetState | null | undefined): PetState | null {
  if (!pet) return null
  const normalized = { ...pet, name: '小多利' as const } as PetState
  normalized.moodLabel = getPetMood(normalized)
  return normalized
}

interface ServerBootstrap {
  room: { id: string; type: 'pair' | 'pet_dm'; proactiveEnabled: boolean }
  pet: Omit<PetState, 'moodLabel'> | null
  messages: ServerMessage[]
  memories: PetMemory[]
}

interface ServerPost extends Omit<Post, 'likes'> {
  likes?: { count: number; likedByMe: boolean }
}

export interface SocialApi {
  listConversations(): Promise<Conversation[]>
  bootstrapRoom(roomId: string, currentUserId: string): Promise<RoomBootstrap>
  setProactive(roomId: string, enabled: boolean): Promise<{ proactiveEnabled: boolean }>
  updateProfile(patch: {
    avatarUrl?: string | null
    avatarConfig?: string | null
    displayName?: string | null
    birthday?: string | null
    mbti?: string | null
    gender?: UserProfile['gender']
  }): Promise<UserProfile>
  // 心情
  listMoods(roomId: string, fromDay: string, toDay: string): Promise<MoodEntry[]>
  setMood(roomId: string, level: number): Promise<MoodEntry>
  // 动态
  listPosts(roomId: string): Promise<Post[]>
  createPost(roomId: string, input: { text: string; imageUrl?: string }): Promise<Post>
  likePost(postId: string, liked: boolean): Promise<{ count: number; likedByMe: boolean }>
  // 通知
  listNotifications(): Promise<{ items: AppNotification[]; unread: number }>
  markAllNotificationsRead(): Promise<{ unread: number }>
  // 运势与暗号
  getFortune(): Promise<Fortune>
  getCodeword(roomId: string): Promise<CodewordState>
  answerCodeword(roomId: string, answer: string): Promise<CodewordState>
  // 贡献榜
  listContributions(roomId: string): Promise<ContributionStat[]>
  // 足迹地图
  listMapLights(roomId: string): Promise<MapLight[]>
  lightMapSpot(roomId: string, spotId: number): Promise<MapLight>
}

const realSocialApi: SocialApi = {
  listConversations() {
    return apiRequest<Conversation[]>('/api/social/conversations')
  },
  async bootstrapRoom(roomId, currentUserId) {
    const raw = await apiRequest<ServerBootstrap>(`/api/rooms/${roomId}`)
    const messages: Message[] = raw.messages.map((message) => mapServerMessage(message, currentUserId))
    return { room: raw.room, pet: normalizePet(raw.pet), messages, memories: raw.memories }
  },
  setProactive(roomId, enabled) {
    return apiRequest<{ proactiveEnabled: boolean }>(`/api/social/rooms/${roomId}/proactive`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled })
    })
  },
  updateProfile(patch) {
    return apiRequest<UserProfile>('/api/session/profile', {
      method: 'PATCH',
      body: JSON.stringify(patch)
    })
  },
  listMoods(roomId, fromDay, toDay) {
    return apiRequest<MoodEntry[]>(`/api/social/rooms/${roomId}/moods?from=${fromDay}&to=${toDay}`)
  },
  setMood(roomId, level) {
    return apiRequest<MoodEntry>(`/api/social/rooms/${roomId}/moods`, {
      method: 'PUT',
      body: JSON.stringify({ level })
    })
  },
  async listPosts(roomId) {
    const posts = await apiRequest<ServerPost[]>(`/api/social/rooms/${roomId}/posts`)
    return posts
  },
  createPost(roomId, input) {
    return apiRequest<Post>(`/api/social/rooms/${roomId}/posts`, {
      method: 'POST',
      body: JSON.stringify(input)
    })
  },
  likePost(postId, liked) {
    return apiRequest<{ count: number; likedByMe: boolean }>(`/api/social/posts/${postId}/like`, {
      method: liked ? 'POST' : 'DELETE'
    })
  },
  listNotifications() {
    return apiRequest<{ items: AppNotification[]; unread: number }>('/api/social/notifications')
  },
  markAllNotificationsRead() {
    return apiRequest<{ unread: number }>('/api/social/notifications/read-all', { method: 'POST', body: '{}' })
  },
  getFortune() {
    return apiRequest<Fortune>('/api/social/fortune/today')
  },
  getCodeword(roomId) {
    return apiRequest<CodewordState>(`/api/social/rooms/${roomId}/codeword`)
  },
  answerCodeword(roomId, answer) {
    return apiRequest<CodewordState>(`/api/social/rooms/${roomId}/codeword`, {
      method: 'PUT',
      body: JSON.stringify({ answer })
    })
  },
  listContributions(roomId) {
    return apiRequest<ContributionStat[]>(`/api/social/rooms/${roomId}/contributions`)
  },
  listMapLights(roomId) {
    return apiRequest<MapLight[]>(`/api/social/rooms/${roomId}/map`)
  },
  lightMapSpot(roomId, spotId) {
    return apiRequest<MapLight>(`/api/social/rooms/${roomId}/map`, {
      method: 'POST',
      body: JSON.stringify({ spotId })
    })
  }
}

export const socialApi: SocialApi = runtimeConfig.useMockApi ? mockSocialApi : realSocialApi
