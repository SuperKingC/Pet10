import { apiRequest } from './apiClient'
import type { ServerPet } from './petApi'

export interface RoomMessage {
  id: string
  roomId: string
  senderType: 'user' | 'pet'
  senderId?: string
  kind: 'text' | 'image' | 'pet'
  text: string
  imageUrl?: string
  createdAt: string
}

export interface RoomBootstrap {
  room: {
    id: string
    type: 'pair' | 'pet_dm'
    proactiveEnabled: boolean
  }
  pet: ServerPet | null
  messages: RoomMessage[]
}

const roomPath = (roomId: string) => `/api/rooms/${encodeURIComponent(roomId)}`

export const roomApi = {
  bootstrap(roomId: string) {
    return apiRequest<RoomBootstrap>(roomPath(roomId))
  },
  listMessages(roomId: string) {
    return apiRequest<RoomMessage[]>(`${roomPath(roomId)}/messages`)
  },
  sendMessage(roomId: string, text: string) {
    return apiRequest<RoomMessage>(`${roomPath(roomId)}/messages`, {
      method: 'POST',
      body: { text },
    })
  },
  requestPetReply(roomId: string) {
    return apiRequest<RoomMessage>(`${roomPath(roomId)}/pet-replies`, {
      method: 'POST',
    })
  },
}
