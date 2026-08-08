import type { Conversation } from '../domain/types'

export function sortConversationsByLatest(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((first, second) => second.updatedAt.localeCompare(first.updatedAt))
}
