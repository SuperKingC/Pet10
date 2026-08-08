import { apiRequest } from './httpClient'
import type { Message, PetMemory, PetState } from '../domain/types'
import { mapServerMessage, type ServerMessage } from './messageMapper'

export interface ServerUser {
  id: string
  email: string
  username: string
  displayName: string
  avatarUrl?: string | null
  birthday?: string | null
  mbti?: string | null
}

export interface ServerFriend {
  id: string
  email: string
  username: string
  displayName: string
  avatarUrl?: string | null
  birthday?: string | null
  mbti?: string | null
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
    const session = await apiRequest<Omit<ServerSession, 'messages'> & { messages?: ServerMessage[] }>('/api/session')
    return {
      ...session,
      messages: session.messages?.map((message) => mapServerMessage(message, session.user.id))
    }
  },
  updateUsername(username: string) {
    return apiRequest<ServerUser>('/api/session/username', {
      method: 'PATCH',
      body: JSON.stringify({ username })
    })
  }
}
