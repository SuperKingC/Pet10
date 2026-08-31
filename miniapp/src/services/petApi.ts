import type { PetAction, PetMoodState } from '../domain/types'
import { apiRequest } from './apiClient'
import { mapRoomPet } from './petMapper'

export interface ServerPet {
  id: string
  relationshipId?: string
  roomId?: string
  name: string
  level: number
  experience: number
  experienceToNextLevel: number
  hunger: number
  mood: number
  energy: number
  health: number
  intimacy: number
  updatedAt?: string
  /** 服务端心情引擎推导的五档心情与状态卡文案（旧后端可能缺省） */
  moodState?: PetMoodState
  moodCaption?: string
}

export interface RoomBootstrap {
  room: { id: string; type: 'pair' | 'pet_dm'; proactiveEnabled: boolean }
  pet: ServerPet | null
}

export const petApi = {
  getRoom(roomId: string) {
    return apiRequest<RoomBootstrap>(`/api/rooms/${encodeURIComponent(roomId)}`)
  },
  applyAction(roomId: string, action: PetAction) {
    return apiRequest<ServerPet>(`/api/rooms/${encodeURIComponent(roomId)}/pet-actions`, {
      method: 'POST',
      body: { action }
    }).then(mapRoomPet)
  }
}
