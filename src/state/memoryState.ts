import type { PetMemory } from '../domain/types'

export function upsertMemory(memories: PetMemory[], memory: PetMemory): PetMemory[] {
  return [memory, ...memories.filter((item) => item.id !== memory.id)]
}
