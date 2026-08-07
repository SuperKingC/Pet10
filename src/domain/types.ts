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
