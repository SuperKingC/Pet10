import { describe, expect, it } from 'vitest'
import { sortConversationsByLatest } from './conversationOrder.js'

describe('conversation ordering', () => {
  it('sorts every conversation by latest activity without pinning pet direct messages', () => {
    const conversations = [
      { roomId: 'pet', type: 'pet_dm' as const, title: 'pet', avatarUrl: null, proactiveEnabled: true, updatedAt: '2026-08-08T09:00:00.000Z' },
      { roomId: 'friend-new', type: 'pair' as const, title: 'new', avatarUrl: null, proactiveEnabled: true, updatedAt: '2026-08-08T11:00:00.000Z' },
      { roomId: 'friend-old', type: 'pair' as const, title: 'old', avatarUrl: null, proactiveEnabled: true, updatedAt: '2026-08-08T08:00:00.000Z' }
    ]

    expect(sortConversationsByLatest(conversations).map((item) => item.roomId)).toEqual([
      'friend-new',
      'pet',
      'friend-old'
    ])
  })
})
