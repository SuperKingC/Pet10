import type { Conversation } from './socialService.js'

export function sortConversationsByLatest(conversations: Conversation[]): Conversation[] {
  return conversations.sort((first, second) => second.updatedAt.localeCompare(first.updatedAt))
}
