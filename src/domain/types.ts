export type UserId = 'you' | 'friend'

export type PetMood = 'happy' | 'sleepy' | 'hungry' | 'clingy'

export type MessageKind = 'text' | 'image' | 'pet'

export interface Message {
  id: string
  sender: UserId | 'pet'
  kind: MessageKind
  text: string
  createdAt: string
  imageUrl?: string
  /** 服务端真实发送者 id（资料卡/多房间用） */
  senderId?: string
  /** 服务端时间戳（日期分隔/日历事件用） */
  rawCreatedAt?: string
}

export interface PetState {
  name: '小多利'
  level: number
  experience: number
  experienceToNextLevel: number
  hunger: number
  mood: number
  energy: number
  health: number
  intimacy: number
  moodLabel: PetMood
}

export interface PetMemory {
  id: string
  text: string
  sourceMessageId: string
  canMention: boolean
}

// ---------- 社交化新增 ----------
export interface UserProfile {
  id: string
  email: string
  username: string
  displayName: string
  /** 8 位公开 ID（加好友用，非真实 id） */
  publicCode?: string | null
  avatarUrl?: string | null
  /** 捏脸配置 JSON（AvatarConfig 序列化） */
  avatarConfig?: string | null
  birthday?: string | null
  mbti?: string | null
}

/** 捏脸配置：每项为选项 id，空/null 表示不佩戴 */
export interface AvatarConfig {
  skin: string
  face: string
  hair: string
  hairColor: string
  eyes: string
  mouth: string
  blush: boolean
  glasses: string | null
  beard: string | null
  hat: string | null
  neck: string | null
  held: string | null
  background: string
}

export function parseAvatarConfig(raw?: string | null): AvatarConfig | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<AvatarConfig>
    if (!parsed.skin || !parsed.face) return null
    return {
      skin: parsed.skin,
      face: parsed.face,
      hair: parsed.hair ?? 'none',
      hairColor: parsed.hairColor ?? '#6b4a2f',
      eyes: parsed.eyes ?? 'round',
      mouth: parsed.mouth ?? 'smile',
      blush: parsed.blush ?? false,
      glasses: parsed.glasses ?? null,
      beard: parsed.beard ?? null,
      hat: parsed.hat ?? null,
      neck: parsed.neck ?? null,
      held: parsed.held ?? null,
      background: parsed.background ?? '#ffe9c7'
    }
  } catch {
    return null
  }
}

export interface MapLight {
  spotId: number
  litBy: string
  createdAt: string
}

export interface Conversation {
  roomId: string
  type: 'pair' | 'pet_dm'
  title: string
  avatarUrl: string | null
  proactiveEnabled: boolean
  friend?: UserProfile
  latestMessage?: { id: string; text: string; kind: MessageKind; createdAt: string }
  updatedAt: string
}

export interface RoomBootstrap {
  room: { id: string; type: 'pair' | 'pet_dm'; proactiveEnabled: boolean }
  pet: PetState | null
  messages: Message[]
  memories: PetMemory[]
}

export interface MoodEntry {
  id: string
  roomId: string
  userId: string
  day: string
  level: number
  updatedAt: string
}

export interface Post {
  id: string
  roomId: string
  authorType: 'user' | 'pet'
  authorId?: string | null
  text: string
  imageUrl?: string | null
  createdAt: string
  likes?: { count: number; likedByMe: boolean }
}

export interface AppNotification {
  id: string
  userId: string
  type: string
  payload: Record<string, unknown>
  read: boolean
  createdAt: string
}

export interface FortuneContent {
  schemaVersion: 2
  zodiac: string
  theme: string
  overall: { rating: number; summary: string; text: string }
  love: { rating: number; single: string; partnered: string }
  study: { rating: number; text: string }
  work: { rating: number; text: string }
  wealth: { rating: number; text: string }
  health: { rating: number; text: string }
  luckyColor: { name: string; hex: string }
  luckyNumber: number
  luckyPhrase: string
}

export interface Fortune {
  id: string
  userId: string
  day: string
  content: FortuneContent
}

export interface CodewordState {
  day: string
  question: string
  myAnswer: string | null
  partnerAnswer: string | null
  answeredCount: number
}

export interface ContributionStat {
  userId: string
  action: string
  count: number
}

export const ZODIAC_LABELS: Array<{ name: string; icon: string }> = [
  { name: '白羊座', icon: '♈' },
  { name: '金牛座', icon: '♉' },
  { name: '双子座', icon: '♊' },
  { name: '巨蟹座', icon: '♋' },
  { name: '狮子座', icon: '♌' },
  { name: '处女座', icon: '♍' },
  { name: '天秤座', icon: '♎' },
  { name: '天蝎座', icon: '♏' },
  { name: '射手座', icon: '♐' },
  { name: '摩羯座', icon: '♑' },
  { name: '水瓶座', icon: '♒' },
  { name: '双鱼座', icon: '♓' }
]

export function zodiacFromBirthday(birthday?: string | null): { name: string; icon: string } | null {
  if (!birthday) return null
  const date = new Date(birthday)
  if (Number.isNaN(date.getTime())) return null
  const month = date.getMonth() + 1
  const day = date.getDate()
  // 边界：(月, 日) >= 起始日 → 当前座，否则上一座
  const edges: Array<[number, number, number]> = [
    [1, 20, 10], [2, 19, 11], [3, 21, 0], [4, 20, 1], [5, 21, 2], [6, 22, 3],
    [7, 23, 4], [8, 23, 5], [9, 23, 6], [10, 24, 7], [11, 23, 8], [12, 22, 9]
  ]
  for (const [edgeMonth, edgeDay, zodiacIndex] of edges) {
    if (month === edgeMonth && day < edgeDay) {
      return ZODIAC_LABELS[(zodiacIndex + 11) % 12]
    }
    if (month === edgeMonth && day >= edgeDay) {
      return ZODIAC_LABELS[zodiacIndex]
    }
  }
  return null
}
