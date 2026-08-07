import type { Message } from '../domain/types'

export function appendUniqueMessage(messages: Message[], message: Message): Message[] {
  return messages.some((item) => item.id === message.id)
    ? messages
    : [...messages, message]
}

