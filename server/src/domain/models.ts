export type Id = string
export type RelationshipStatus = 'pending' | 'accepted' | 'rejected'
export type MessageSenderType = 'user' | 'pet'
export type MessageKind = 'text' | 'image' | 'pet'
export type PetAction = 'feed' | 'play' | 'clean' | 'sleep'

export interface User {
  id: Id
  email: string
  username: string
  displayName: string
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
  relationshipId: Id
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
