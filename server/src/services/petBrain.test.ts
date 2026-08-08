import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatMessage } from '../domain/models.js'
import { createMemoryRepositories } from '../repositories/memoryRepositories.js'
import { createFriendshipService } from './friendshipService.js'
import { createPetBrain } from './petBrain.js'

async function createPairRoom() {
  const repositories = createMemoryRepositories()
  const first = await repositories.users.create({ email: 'a@example.com', username: 'a', displayName: 'A' })
  const second = await repositories.users.create({ email: 'b@example.com', username: 'b', displayName: 'B' })
  const friendship = createFriendshipService(repositories)
  const relationship = await friendship.sendRequest(first.id, second.username)
  await friendship.acceptRequest(second.id, relationship.id)
  const room = await repositories.rooms.findByRelationshipId(relationship.id)
  if (!room) throw new Error('room missing')
  return { repositories, first, second, room }
}

async function storeUserMessage(
  repositories: Awaited<ReturnType<typeof createPairRoom>>['repositories'],
  roomId: string,
  senderId: string,
  text: string
): Promise<ChatMessage> {
  return repositories.messages.create({ roomId, senderType: 'user', senderId, kind: 'text', text })
}

describe('pet brain pair-room scheduling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('batches messages received within 1.5 seconds into one reply', async () => {
    const { repositories, first, second, room } = await createPairRoom()
    const receivedMessageTexts: string[][] = []
    const reply = vi.fn(async (context: { messages: ChatMessage[] }) => {
      receivedMessageTexts.push(context.messages.map((message) => message.text))
      return 'one reply'
    })
    const brain = createPetBrain({
      repositories,
      ai: { reply, extractMemory: async () => null },
      emit: vi.fn()
    })

    const firstMessage = await storeUserMessage(repositories, room.id, first.id, 'first')
    await brain.onUserMessage(room.id, firstMessage)
    await vi.advanceTimersByTimeAsync(1000)
    const secondMessage = await storeUserMessage(repositories, room.id, second.id, 'second')
    await brain.onUserMessage(room.id, secondMessage)
    await vi.advanceTimersByTimeAsync(1499)

    expect(reply).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(reply).toHaveBeenCalledTimes(1)
    expect(receivedMessageTexts[0]).toEqual(['first', 'second'])
  })

  it('does not automatically reply when proactive mode is disabled', async () => {
    const { repositories, first, room } = await createPairRoom()
    await repositories.rooms.setProactive(room.id, false)
    const reply = vi.fn(async () => 'unused')
    const brain = createPetBrain({
      repositories,
      ai: { reply, extractMemory: async () => null },
      emit: vi.fn()
    })

    const message = await storeUserMessage(repositories, room.id, first.id, 'hello')
    await brain.onUserMessage(room.id, message)
    await vi.advanceTimersByTimeAsync(30 * 60 * 1000)

    expect(reply).not.toHaveBeenCalled()
  })

  it('queues messages received during a reply for a later batch', async () => {
    const { repositories, first, second, room } = await createPairRoom()
    let finishFirstReply: ((text: string) => void) | undefined
    const reply = vi.fn()
      .mockImplementationOnce(() => new Promise<string>((resolve) => { finishFirstReply = resolve }))
      .mockResolvedValue('second reply')
    const brain = createPetBrain({
      repositories,
      ai: { reply, extractMemory: async () => null },
      emit: vi.fn()
    })

    const firstMessage = await storeUserMessage(repositories, room.id, first.id, 'first')
    await brain.onUserMessage(room.id, firstMessage)
    await vi.advanceTimersByTimeAsync(1500)
    expect(reply).toHaveBeenCalledTimes(1)

    const secondMessage = await storeUserMessage(repositories, room.id, second.id, 'while replying')
    await brain.onUserMessage(room.id, secondMessage)
    await vi.advanceTimersByTimeAsync(5000)
    expect(reply).toHaveBeenCalledTimes(1)

    finishFirstReply?.('first reply')
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(1499)
    expect(reply).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)
    expect(reply).toHaveBeenCalledTimes(2)
  })

  it('speaks proactively after ten minutes while the pair room is active', async () => {
    const { repositories, first, room } = await createPairRoom()
    const reply = vi.fn(async () => 'reply')
    const brain = createPetBrain({
      repositories,
      ai: { reply, extractMemory: async () => null },
      emit: vi.fn()
    })

    const message = await storeUserMessage(repositories, room.id, first.id, 'hello')
    await brain.onUserMessage(room.id, message)
    await vi.advanceTimersByTimeAsync(1500)
    expect(reply).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(10 * 60 * 1000 - 1)
    expect(reply).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)
    expect(reply).toHaveBeenCalledTimes(2)
  })
})
