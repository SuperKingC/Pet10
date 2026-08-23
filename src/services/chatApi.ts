import type { Message, PetState } from '../domain/types'
import { apiRequest } from './httpClient'
import { mapServerMessage, type ServerMessage } from './messageMapper'
import { runtimeConfig } from './runtimeConfig'
import { mockChatApi } from './mock/mockChatApi'

export interface SendMessageInput {
  roomId: string
  text: string
  imageUrl?: string
}

export interface ChatApi {
  sendMessage(input: SendMessageInput): Promise<Message>
  requestPetReply(roomId: string, messages: Message[], pet: PetState): Promise<Message>
  applyPetAction(roomId: string, action: 'feed' | 'play' | 'clean' | 'sleep'): Promise<PetState>
  uploadImage(file: File): Promise<string>
}

const realChatApi: ChatApi = {
  async sendMessage(input) {
    const message = await apiRequest<ServerMessage>(`/api/rooms/${input.roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text: input.text, imageUrl: input.imageUrl })
    })
    return mapServerMessage(message, message.senderId)
  },
  async requestPetReply(roomId) {
    const message = await apiRequest<ServerMessage>(`/api/rooms/${roomId}/pet-replies`, {
      method: 'POST',
      body: '{}'
    })
    return mapServerMessage(message)
  },
  applyPetAction(roomId, action) {
    return apiRequest<PetState>(`/api/rooms/${roomId}/pet-actions`, {
      method: 'POST',
      body: JSON.stringify({ action })
    })
  },
  async uploadImage(file) {
    // OSS direct-upload signing will replace this local preview in the next deployment step.
    return URL.createObjectURL(file)
  }
}

export const chatApi: ChatApi = runtimeConfig.useMockApi ? mockChatApi : realChatApi
