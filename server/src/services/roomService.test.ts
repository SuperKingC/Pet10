import { describe, expect, it, vi } from 'vitest'
import { createMemoryRepositories } from '../repositories/memoryRepositories.js'
import { createFriendshipService } from './friendshipService.js'
import { createRoomService } from './roomService.js'

describe('room service', () => {
  it('stores a user message and creates a pet reply in the same room', async () => {
    const repositories = createMemoryRepositories()
    const first = await repositories.users.create({ email: 'a@example.com', username: 'a', displayName: 'A' })
    const second = await repositories.users.create({ email: 'b@example.com', username: 'b', displayName: 'B' })
    const friendship = createFriendshipService(repositories)
    const relationship = await friendship.sendRequest(first.id, second.username)
    await friendship.acceptRequest(second.id, relationship.id)
    const room = await repositories.rooms.findByRelationshipId(relationship.id)
    if (!room) throw new Error('room missing')

    const service = createRoomService({
      repositories,
      ai: { reply: async () => '汪！我听到了。', fortune: async () => undefined }
    })
    await service.sendMessage(room.id, first.id, { text: '@小多利 你好' })
    const petMessage = await service.requestPetReply(room.id, first.id)
    const messages = await repositories.messages.listRecent(room.id, 10)

    expect(petMessage.senderType).toBe('pet')
    expect(messages.map((message) => message.text)).toEqual(['@小多利 你好', '汪！我听到了。'])
  })

  it('rejects a user outside the room', async () => {
    const repositories = createMemoryRepositories()
    const outsider = await repositories.users.create({ email: 'o@example.com', username: 'o', displayName: 'O' })
    const service = createRoomService({
      repositories,
      ai: { reply: async () => 'unused', fortune: async () => undefined }
    })

    await expect(service.listMessages('missing-room', outsider.id)).rejects.toThrow('room_forbidden')
  })

  it('logs the AI failure before returning the fallback reply', async () => {
    const repositories = createMemoryRepositories()
    const first = await repositories.users.create({ email: 'a@example.com', username: 'a', displayName: 'A' })
    const second = await repositories.users.create({ email: 'b@example.com', username: 'b', displayName: 'B' })
    const friendship = createFriendshipService(repositories)
    const relationship = await friendship.sendRequest(first.id, second.username)
    await friendship.acceptRequest(second.id, relationship.id)
    const room = await repositories.rooms.findByRelationshipId(relationship.id)
    if (!room) throw new Error('room missing')
    const logError = vi.fn()
    const service = createRoomService({
      repositories,
      ai: { reply: async () => { throw new Error('ai_request_failed:401') }, fortune: async () => undefined },
      logError
    })

    const reply = await service.requestPetReply(room.id, first.id)

    expect(reply.text).toContain('打了个盹')
    expect(logError).toHaveBeenCalledWith('Pet AI reply failed', expect.any(Error))
  })
})
