export type Id = string
export type RelationshipStatus = 'pending' | 'accepted' | 'rejected'
export type MessageSenderType = 'user' | 'pet'
export type MessageKind = 'text' | 'image' | 'pet'
export type PetAction = 'feed' | 'play' | 'clean' | 'sleep'
export type RoomType = 'pair' | 'pet_dm'

export interface User {
  id: Id
  email: string
  username: string
  displayName: string
  avatarUrl?: string | null
  birthday?: string | null
  mbti?: string | null
  createdAt: Date
}

export interface InviteCode {
  code: string
  active: boolean
  maxUses: number
  useCount: number
}

export interface LoginCode {
  email: string
  codeHash: string
  expiresAt: Date
}

export interface Relationship {
  id: Id
  requesterId: Id
  addresseeId: Id
  status: RelationshipStatus
  createdAt: Date
}

export interface Room {
  id: Id
  relationshipId?: Id | null
  type: RoomType
  proactiveEnabled: boolean
  createdAt: Date
}

export interface Pet {
  id: Id
  relationshipId: Id
  roomId: Id
  name: '小多利'
  level: number
  experience: number
  experienceToNextLevel: number
  hunger: number
  mood: number
  energy: number
  health: number
  intimacy: number
  updatedAt: Date
}

export interface ChatMessage {
  id: Id
  roomId: Id
  senderType: MessageSenderType
  senderId?: Id
  kind: MessageKind
  text: string
  imageUrl?: string
  createdAt: Date
}

export interface PetMemory {
  id: Id
  roomId: Id
  text: string
  sourceMessageId?: Id
  canMention: boolean
  createdAt: Date
}

export interface MoodEntry {
  id: Id
  roomId: Id
  userId: Id
  day: string
  level: number
  updatedAt: Date
}

export interface Post {
  id: Id
  roomId: Id
  authorType: 'user' | 'pet'
  authorId?: Id | null
  text: string
  imageUrl?: string | null
  createdAt: Date
}

export interface AppNotification {
  id: Id
  userId: Id
  type: string
  payload: Record<string, unknown>
  read: boolean
  createdAt: Date
}

export interface FortuneContent {
  mine: string
  friend: string
  pair: string
  luckyAction: PetAction
  luckyColor: string
  luckyNumber: number
}

export interface Fortune {
  id: Id
  roomId: Id
  day: string
  content: FortuneContent
  createdAt: Date
}

export interface CodewordAnswer {
  roomId: Id
  day: string
  userId: Id
  answer: string
  createdAt: Date
}

export interface PetEventStat {
  userId: Id
  action: string
  count: number
}
