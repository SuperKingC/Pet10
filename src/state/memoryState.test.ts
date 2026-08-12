import { describe, expect, it } from 'vitest'
import type { PetMemory } from '../domain/types'
import { upsertMemory } from './memoryState'

describe('upsertMemory', () => {
  it('places a created memory first without duplicating its id', () => {
    const previous: PetMemory[] = [
      { id: 'memory-1', text: '旧内容', sourceMessageId: '', canMention: true },
      { id: 'memory-2', text: '另一条', sourceMessageId: '', canMention: true }
    ]
    const created: PetMemory = {
      id: 'memory-1',
      text: '新内容',
      sourceMessageId: '',
      canMention: true
    }

    expect(upsertMemory(previous, created)).toEqual([
      created,
      previous[1]
    ])
  })
})
