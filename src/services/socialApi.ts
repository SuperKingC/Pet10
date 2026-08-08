import { apiRequest } from './httpClient'
import { runtimeConfig } from './runtimeConfig'
import { getPetMood } from '../domain/petRules'
import type {
  AppNotification,
  CodewordState,
  Conversation,
  ContributionStat,
  Fortune,
  Message,
  MoodEntry,
  PetMemory,
  PetState,
  Post,
  RoomBootstrap,
  UserProfile
} from '../domain/types'
import { mapServerMessage, type ServerMessage } from './messageMapper'

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
  updateProfile(patch: { avatarUrl?: string; birthday?: string | null; mbti?: string | null }): Promise<UserProfile>
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
  getFortune(roomId: string): Promise<Fortune>
  getCodeword(roomId: string): Promise<CodewordState>
  answerCodeword(roomId: string, answer: string): Promise<CodewordState>
  // 贡献榜
  listContributions(roomId: string): Promise<ContributionStat[]>
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
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
  getFortune(roomId) {
    return apiRequest<Fortune>(`/api/social/rooms/${roomId}/fortune`)
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
  }
}

// ---------- Mock 模式（本地演示用，单一 pair 房 + 小多利私聊） ----------
import { initialSnapshot } from '../state/mockStore'

const mockConversations: Conversation[] = [
  {
    roomId: 'pet-dm',
    type: 'pet_dm',
    title: '小多利',
    avatarUrl: '/pet/xiaoduoli-small.jpg',
    proactiveEnabled: true,
    updatedAt: new Date().toISOString()
  },
  {
    roomId: initialSnapshot.room.id,
    type: 'pair',
    title: initialSnapshot.friend.name,
    avatarUrl: initialSnapshot.friend.avatar,
    proactiveEnabled: true,
    updatedAt: new Date().toISOString()
  }
]

const mockSocialApi: SocialApi = {
  async listConversations() {
    return mockConversations
  },
  async bootstrapRoom(roomId) {
    if (roomId === 'pet-dm') {
      return { room: { id: roomId, type: 'pet_dm', proactiveEnabled: true }, pet: null, messages: [], memories: [] }
    }
    return {
      room: { id: roomId, type: 'pair', proactiveEnabled: true },
      pet: initialSnapshot.pet,
      messages: initialSnapshot.messages,
      memories: initialSnapshot.memories
    }
  },
  async setProactive(_roomId, enabled) {
    return { proactiveEnabled: enabled }
  },
  async updateProfile(patch) {
    return {
      id: 'you',
      email: 'you@pet10.local',
      username: 'you',
      displayName: '我',
      avatarUrl: patch.avatarUrl ?? null,
      birthday: patch.birthday ?? null,
      mbti: patch.mbti ?? null
    }
  },
  async listMoods() {
    return [{ id: 'm1', roomId: initialSnapshot.room.id, userId: 'you', day: todayKey(), level: 3, updatedAt: new Date().toISOString() }]
  },
  async setMood(roomId, level) {
    return { id: 'm1', roomId, userId: 'you', day: todayKey(), level, updatedAt: new Date().toISOString() }
  },
  async listPosts() {
    return [
      {
        id: 'p1',
        roomId: initialSnapshot.room.id,
        authorType: 'pet',
        authorId: null,
        text: '汪！今天谁先陪我散步，我就跟谁贴贴～',
        imageUrl: null,
        createdAt: new Date().toISOString(),
        likes: { count: 1, likedByMe: false }
      }
    ]
  },
  async createPost(roomId, input) {
    return {
      id: `p-${Date.now()}`,
      roomId,
      authorType: 'user',
      authorId: 'you',
      text: input.text,
      imageUrl: input.imageUrl ?? null,
      createdAt: new Date().toISOString(),
      likes: { count: 0, likedByMe: false }
    }
  },
  async likePost(_postId, liked) {
    return { count: liked ? 1 : 0, likedByMe: liked }
  },
  async listNotifications() {
    return { items: [], unread: 0 }
  },
  async markAllNotificationsRead() {
    return { unread: 0 }
  },
  async getFortune(roomId) {
    return {
      id: 'f1',
      roomId,
      day: todayKey(),
      content: {
        mine: '今天的直觉很准，想做的事就放手去试。',
        friend: 'TA 今天需要被肯定，夸 TA 一句会有奇效。',
        pair: '你们俩今天的默契值拉满，一个眼神就能对上暗号。',
        luckyAction: 'play',
        luckyColor: '奶油黄',
        luckyNumber: 7
      }
    }
  },
  async getCodeword() {
    return { day: todayKey(), question: '用一种天气形容你现在的心情？', myAnswer: null, partnerAnswer: null, answeredCount: 0 }
  },
  async answerCodeword(_roomId, answer) {
    return { day: todayKey(), question: '用一种天气形容你现在的心情？', myAnswer: answer, partnerAnswer: null, answeredCount: 1 }
  },
  async listContributions() {
    return [
      { userId: 'you', action: 'feed', count: 6 },
      { userId: 'friend', action: 'play', count: 4 }
    ]
  }
}

export const socialApi: SocialApi = runtimeConfig.useMockApi ? mockSocialApi : realSocialApi
