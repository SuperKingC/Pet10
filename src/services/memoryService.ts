import type { PetMemory } from '../domain/types'
import { apiRequest } from './httpClient'
import { runtimeConfig } from './runtimeConfig'

export interface MemoryService {
  removeMemory(memories: PetMemory[], memoryId: string): Promise<PetMemory[]>
}

export const memoryService: MemoryService = {
  async removeMemory(memories, memoryId) {
    await new Promise((resolve) => window.setTimeout(resolve, 180))
    return memories.filter((memory) => memory.id !== memoryId)
  }
}

export function createMemoryService(roomId: string): MemoryService {
  if (runtimeConfig.useMockApi) return memoryService
  return {
    async removeMemory(_memories, memoryId) {
      await apiRequest<void>(`/api/rooms/${roomId}/memories/${memoryId}`, { method: 'DELETE' })
      return _memories.filter((memory) => memory.id !== memoryId)
    }
  }
}
