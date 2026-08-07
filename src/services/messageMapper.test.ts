import { describe, expect, it } from 'vitest'
import { mapServerMessage } from './messageMapper'

const baseMessage = {
  id: 'message-1',
  kind: 'text' as const,
  text: '你好',
  createdAt: '2026-08-07T10:00:00.000Z'
}

describe('mapServerMessage', () => {
  it('maps the current user message to the right side', () => {
    const message = mapServerMessage({
      ...baseMessage,
      senderType: 'user',
      senderId: 'user-1'
    }, 'user-1')

    expect(message.sender).toBe('you')
  })

  it('maps the friend message to the left side', () => {
    const message = mapServerMessage({
      ...baseMessage,
      senderType: 'user',
      senderId: 'user-2'
    }, 'user-1')

    expect(message.sender).toBe('friend')
  })

  it('keeps pet messages as pet messages', () => {
    const message = mapServerMessage({
      ...baseMessage,
      senderType: 'pet',
      kind: 'pet'
    }, 'user-1')

    expect(message.sender).toBe('pet')
  })
})

