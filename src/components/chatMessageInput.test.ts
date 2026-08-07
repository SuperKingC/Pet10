import { describe, expect, it } from 'vitest'
import { createChatMessageInput } from './chatMessageInput'

describe('createChatMessageInput', () => {
  it('uses the active server room id', () => {
    expect(createChatMessageInput('real-room-id', '你好', undefined)).toEqual({
      roomId: 'real-room-id',
      text: '你好',
      imageUrl: undefined
    })
  })
})

