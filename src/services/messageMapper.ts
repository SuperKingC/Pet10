import type { Message } from '../domain/types'

export interface ServerMessage {
  id: string
  senderType: 'user' | 'pet'
  senderId?: string
  kind: 'text' | 'image' | 'pet'
  text: string
  imageUrl?: string
  createdAt: string
}

export function mapServerMessage(message: ServerMessage, currentUserId?: string): Message {
  return {
    id: message.id,
    sender: message.senderType === 'pet'
      ? 'pet'
      : message.senderId === currentUserId ? 'you' : 'friend',
    kind: message.kind,
    text: message.text,
    imageUrl: message.imageUrl,
    createdAt: new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date(message.createdAt))
  }
}

