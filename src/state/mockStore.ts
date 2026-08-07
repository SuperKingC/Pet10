import type { Message, PetMemory, PetState } from '../domain/types'

export interface AppSnapshot {
  currentUser: {
    id: 'you'
    name: string
    avatar: string
  }
  friend: {
    id: 'friend'
    name: string
    avatar: string
    online: boolean
  }
  room: {
    id: string
    relationshipId: string
  }
  pet: PetState
  messages: Message[]
  memories: PetMemory[]
}

export const initialSnapshot: AppSnapshot = {
  currentUser: {
    id: 'you',
    name: '你',
    avatar: '你'
  },
  friend: {
    id: 'friend',
    name: '多利的另一位主人',
    avatar: '友',
    online: true
  },
  room: {
    id: 'room-demo',
    relationshipId: 'relationship-demo'
  },
  pet: {
    name: '小多利',
    level: 2,
    experience: 38,
    experienceToNextLevel: 100,
    hunger: 68,
    mood: 82,
    energy: 71,
    health: 94,
    intimacy: 46,
    moodLabel: 'happy'
  },
  messages: [
    {
      id: 'message-1',
      sender: 'friend',
      kind: 'text',
      text: '今天也要一起照顾小多利呀。',
      createdAt: '10:18'
    },
    {
      id: 'message-2',
      sender: 'pet',
      kind: 'pet',
      text: '汪！我已经把肚子准备好啦，今天谁来喂我？',
      createdAt: '10:19'
    },
    {
      id: 'message-3',
      sender: 'you',
      kind: 'text',
      text: '先陪你玩一会儿，等下给你吃饭。',
      createdAt: '10:20'
    }
  ],
  memories: [
    {
      id: 'memory-1',
      text: '两位主人喜欢在晚上一起陪小多利聊天。',
      sourceMessageId: 'message-1',
      canMention: true
    },
    {
      id: 'memory-2',
      text: '小多利的领养纪念日是 8 月 7 日。',
      sourceMessageId: 'message-2',
      canMention: true
    }
  ]
}
