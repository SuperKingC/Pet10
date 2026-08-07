import type { PetMemory } from '../domain/types'

export interface MemoryService {
  removeMemory(memories: PetMemory[], memoryId: string): Promise<PetMemory[]>
}

export const memoryService: MemoryService = {
  async removeMemory(memories, memoryId) {
    await new Promise((resolve) => window.setTimeout(resolve, 180))
    return memories.filter((memory) => memory.id !== memoryId)
  }
}
