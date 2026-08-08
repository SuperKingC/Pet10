import { describe, expect, it } from 'vitest'
import type { Conversation } from '../domain/types'
import { sortConversationsByLatest } from './conversationOrder'

describe('frontend conversation ordering', () => {
  it('moves the most recently active room to the top regardless of type', () => {
    const conversations: Conversation[] = [
      { roomId: 'pet', type: 'pet_dm', title: 'pet', avatarUrl: null, proactiveEnabled: true, updatedAt: '2026-08-08T09:00:00.000Z' },
      { roomId: 'pair', type: 'pair', title: 'pair', avatarUrl: null, proactiveEnabled: true, updatedAt: '2026-08-08T10:00:00.000Z' }
    ]

    expect(sortConversationsByLatest(conversations).map((item) => item.roomId)).toEqual(['pair', 'pet'])
  })
})
