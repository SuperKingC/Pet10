import { apiRequest } from './httpClient'
import type { Message, PetMemory, PetState } from '../domain/types'

export interface ServerUser {
  id: string
  email: string
  username: string
  displayName: string
}

export interface ServerFriend {
  id: string
  email: string
  username: string
  displayName: string
}

export interface ServerRelationship {
  id: string
  requesterId: string
  addresseeId: string
  status: 'pending' | 'accepted' | 'rejected'
}

export interface ServerRoom {
  id: string
  relationshipId: string
}

interface ServerMessage {
  id: string
  senderType: 'user' | 'pet'
  kind: 'text' | 'image' | 'pet'
  text: string
  imageUrl?: string
  createdAt: string
}

function mapMessage(message: ServerMessage): Message {
  return {
    id: message.id,
    sender: message.senderType === 'pet' ? 'pet' : 'you',
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

export interface ServerSession {
  status: 'unbound' | 'pending_outgoing' | 'pending_incoming' | 'accepted'
  user: ServerUser
  relationship?: ServerRelationship
  friend?: ServerFriend
  room?: ServerRoom
  pet?: PetState
  messages?: Message[]
  memories?: PetMemory[]
}

export const sessionApi = {
  async getHome() {
    const session = await apiRequest<ServerSession & { messages?: ServerMessage[] }>('/api/session')
    return {
      ...session,
      messages: session.messages?.map(mapMessage)
    }
  },
  updateUsername(username: string) {
    return apiRequest<ServerUser>('/api/session/username', {
      method: 'PATCH',
      body: JSON.stringify({ username })
    })
  }
}
