import { describe, expect, it } from 'vitest'
import type { Message } from '../domain/types'
import { appendUniqueMessage } from './messageCollection'

const message: Message = {
  id: 'message-1',
  sender: 'pet',
  kind: 'pet',
  text: '汪！',
  createdAt: '10:00'
}

describe('appendUniqueMessage', () => {
  it('appends a new message', () => {
    expect(appendUniqueMessage([], message)).toEqual([message])
  })

  it('does not append the same HTTP and realtime message twice', () => {
    expect(appendUniqueMessage([message], message)).toEqual([message])
  })
})

