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

// ---------- Mock 模式（本地演示用，单一 pair 房 + 小多利私聊） ----------
import { initialSnapshot } from '../state/mockStore'
import { sortConversationsByLatest } from './conversationOrder'

const mockConversations: Conversation[] = [
  {
    roomId: 'pet-dm',
    type: 'pet_dm',
    title: '小多利',
    avatarUrl: '/pet/xiaoduoli.png',
    proactiveEnabled: true,
    updatedAt: new Date().toISOString()
  },
  {
    roomId: initialSnapshot.room.id,
    type: 'pair',
    title: initialSnapshot.friend.name,
    avatarUrl: null,
    proactiveEnabled: true,
    updatedAt: new Date(Date.now() + 1000).toISOString(),
    friend: {
      id: 'friend-demo',
      email: 'friend@pet10.local',
      username: 'friend',
      displayName: initialSnapshot.friend.name
    }
  }
]

const mockSocialApi: SocialApi = {
  async listConversations() {
    return sortConversationsByLatest(mockConversations)
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
      displayName: patch.displayName ?? '我',
      publicCode: 'PET10DEMO',
      avatarUrl: patch.avatarUrl ?? null,
      avatarConfig: patch.avatarConfig ?? null,
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
  async getFortune() {
    return {
      id: 'f1',
      userId: 'you',
      day: todayKey(),
      content: {
        schemaVersion: 2,
        zodiac: '狮子座',
        theme: '先整理自己的节奏，再回应外界的变化',
        overall: {
          rating: 4,
          summary: '适合稳步推进手上的安排，清晰的节奏会带来好结果。',
          text: '今天适合先梳理手边事项，再决定精力应该投向哪里。外界可能同时出现几种声音，看似都很紧迫，实际只有少数事情值得立即回应。把目标拆成清楚的小步骤，会比临时加快速度更有效。下午之后判断力逐渐稳定，一项之前悬而未决的安排也有机会出现新的切入点。不要因为进展暂时不明显就否定自己，今天真正重要的是建立可持续的节奏，并把答应自己的事情认真完成。'
        },
        love: {
          rating: 3,
          single: '单身的你今天更容易被谈吐自然、做事有分寸的人吸引。新的联系可能从工作、学习或朋友之间的普通交流开始，不必急着判断对方是否符合全部期待。先观察彼此回应是否稳定，也让对方有机会了解真实的你。若心里已有在意的人，可以从分享一件具体的小事开始靠近；比起含蓄试探，清楚而轻松的表达更容易得到有效反馈。',
          partnered: '有伴的你今天需要在及时回应和保留个人空间之间找到平衡。对方可能更关心你对某件事的明确态度，而不是一个模糊的安慰。适合把近期安排、情绪来源和实际需要说清楚，避免让猜测代替沟通。若之前有小摩擦，可以从讨论具体事件开始，不翻旧账也不急着分胜负。一起完成一件简单的日常事务，会比刻意制造浪漫更能恢复亲近感。'
        },
        study: { rating: 4, text: '学习方面，今天适合处理需要理解和归纳的内容，而不是单纯追求完成数量。先用自己的话写出知识框架，再回头补充细节，记忆会更牢。遇到卡住的部分，不妨先记录具体疑问，短暂切换任务后再回来解决。与同学或伙伴讨论时，主动解释自己的思路能够暴露盲点。晚上复盘一次当天的重点，比临时延长学习时间更有价值。' },
        work: { rating: 4, text: '工作方面，今天的优势在于看清流程里的遗漏，并用更简单的方法推进协作。开始之前先确认目标、期限和负责人，能够减少后续反复。面对临时需求，不必马上全部接下，可以先判断它是否真的优先。沟通中把结论放在前面，再补充背景，会让表达更有力量。下午适合处理需要集中判断的事项，也可能得到来自同事或客户的具体反馈。' },
        wealth: { rating: 2, text: '财运方面，今天更适合整理和控制，而不是追逐短期变化。可以检查近期账单、自动续费和计划中的大额支出，容易发现一项原本忽略的成本。面对临时优惠或朋友推荐，先问自己是否真的需要，不必因为限时信息立刻决定。用于学习、健康或提升效率的合理投入可以保留，但仍要明确预算上限，避免把期待感当成实际价值。' },
        health: { rating: 5, text: '健康方面，今天需要留意长时间专注带来的肩颈紧张和眼睛疲劳。每完成一段工作就起身活动几分钟，比晚上集中补偿更有效。饮食尽量保持规律，不要因为忙碌拖延正餐。若精神状态起伏明显，先检查睡眠和水分是否充足，不必用更多咖啡勉强支撑。晚间适合降低信息刺激，让身体有明确的收尾信号。' },
        luckyColor: { name: '雾霾蓝', hex: '#7892A8' },
        luckyNumber: 7,
        luckyPhrase: '把注意力放回能由自己决定的事情上。'
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
  },
  async listMapLights() {
    return [{ spotId: 2, litBy: 'you', createdAt: new Date().toISOString() }]
  },
  async lightMapSpot(_roomId, spotId) {
    return { spotId, litBy: 'you', createdAt: new Date().toISOString() }
  }
}

export const socialApi: SocialApi = runtimeConfig.useMockApi ? mockSocialApi : realSocialApi
