import type { Message, PetState } from '../domain/types'

export interface SendMessageInput {
  roomId: string
  text: string
  imageUrl?: string
}

export interface ChatApi {
  sendMessage(input: SendMessageInput): Promise<Message>
  requestPetReply(messages: Message[], pet: PetState): Promise<Message>
  uploadImage(file: File): Promise<string>
}

function nowLabel(): string {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date())
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function choosePetReply(messages: Message[], pet: PetState): string {
  const latest = messages.at(-1)?.text ?? ''
  if (pet.energy < 25) return '小多利有一点困啦，不过还是想靠着你们听一会儿。'
  if (pet.hunger < 35) return '汪呜……小多利的肚子在咕咕叫，可以先吃一点东西吗？'
  if (latest.includes('照片') || messages.at(-1)?.kind === 'image') {
    return '我看到照片啦！等接入看图接口后，我还可以认真告诉你们照片里有什么。'
  }
  if (latest.includes('想你') || latest.includes('喜欢')) {
    return '小多利也最喜欢你们两个一起出现啦！今天要多陪我一会儿。'
  }
  return '汪！我在认真听。你们两个一起说话的时候，我的心情会特别好。'
}

export const chatApi: ChatApi = {
  async sendMessage(input) {
    await new Promise((resolve) => window.setTimeout(resolve, 120))
    return {
      id: createId('message'),
      sender: 'you',
      kind: input.imageUrl ? 'image' : 'text',
      text: input.text,
      imageUrl: input.imageUrl,
      createdAt: nowLabel()
    }
  },

  async requestPetReply(messages, pet) {
    await new Promise((resolve) => window.setTimeout(resolve, 850))
    return {
      id: createId('pet-message'),
      sender: 'pet',
      kind: 'pet',
      text: choosePetReply(messages, pet),
      createdAt: nowLabel()
    }
  },

  async uploadImage(file) {
    await new Promise((resolve) => window.setTimeout(resolve, 250))
    return URL.createObjectURL(file)
  }
}
