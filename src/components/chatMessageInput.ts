import type { SendMessageInput } from '../services/chatApi'

export function createChatMessageInput(roomId: string, text: string, imageUrl?: string): SendMessageInput {
  return {
    roomId,
    text,
    imageUrl
  }
}

