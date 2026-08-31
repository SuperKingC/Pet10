import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatMessage } from '../domain/models.js'
import { createMemoryRepositories } from '../repositories/memoryRepositories.js'
import { createFriendshipService } from './friendshipService.js'
import { createPetBrain } from './petBrain.js'
import { createPetMoodService } from './petMoodService.js'

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

  it('extracts memory after a reply without a random gate and emits the created memory', async () => {
    const { repositories, first, room } = await createPairRoom()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const emit = vi.fn()
    const brain = createPetBrain({
      repositories,
      ai: {
        reply: async () => '记住啦',
        extractMemory: async () => '主人喜欢摄影'
      },
      emit
    })

    const message = await storeUserMessage(repositories, room.id, first.id, '我喜欢摄影')
    await brain.onUserMessage(room.id, message)
    await vi.advanceTimersByTimeAsync(1500)
    await vi.advanceTimersByTimeAsync(0)

    const memories = await repositories.memories.listByRoom(room.id)
    expect(memories.map((memory) => memory.text)).toContain('主人喜欢摄影')
    expect(emit).toHaveBeenCalledWith(room.id, 'memory.created', expect.objectContaining({
      roomId: room.id,
      text: '主人喜欢摄影'
    }))
  })

  it('retries memory extraction after an empty result instead of starting cooldown', async () => {
    const { repositories, first, room } = await createPairRoom()
    const extractMemory = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('主人不吃香菜')
    const brain = createPetBrain({
      repositories,
      ai: { reply: async () => '好', extractMemory },
      emit: vi.fn()
    })

    const firstMessage = await storeUserMessage(repositories, room.id, first.id, '随便聊聊')
    await brain.onUserMessage(room.id, firstMessage)
    await vi.advanceTimersByTimeAsync(1500)
    await vi.advanceTimersByTimeAsync(0)

    const secondMessage = await storeUserMessage(repositories, room.id, first.id, '我不吃香菜')
    await brain.onUserMessage(room.id, secondMessage)
    await vi.advanceTimersByTimeAsync(1500)
    await vi.advanceTimersByTimeAsync(0)

    expect(extractMemory).toHaveBeenCalledTimes(2)
    expect((await repositories.memories.listByRoom(room.id)).map((memory) => memory.text)).toContain('主人不吃香菜')
  })

  it('saves an explicit important memory immediately and replies without AI', async () => {
    const { repositories, first, room } = await createPairRoom()
    const reply = vi.fn(async () => '不应调用')
    const emit = vi.fn()
    const brain = createPetBrain({
      repositories,
      ai: { reply, extractMemory: async () => null },
      emit
    })

    const message = await storeUserMessage(repositories, room.id, first.id, '记住我不吃香菜')
    await brain.onUserMessage(room.id, message)

    const memories = await repositories.memories.listByRoom(room.id)
    expect(memories[0]).toMatchObject({
      text: '我不吃香菜',
      importance: 3,
      source: 'explicit'
    })
    expect(reply).not.toHaveBeenCalled()
    expect(emit).toHaveBeenCalledWith(room.id, 'memory.created', memories[0])
    expect(emit).toHaveBeenCalledWith(room.id, 'message.created', expect.objectContaining({
      text: expect.stringContaining('记住')
    }))
  })

  it('passes the pet mood tone hint into the persona context', async () => {
    const { repositories, first, room } = await createPairRoom()
    await repositories.pets.createForRelationship(room.relationshipId!, room.id)
    const mood = createPetMoodService({ repositories })
    const reply = vi.fn(async (_context: { moodText?: string }) => '好')
    const brain = createPetBrain({
      repositories,
      ai: { reply, extractMemory: async () => null },
      emit: vi.fn(),
      mood
    })

    const message = await storeUserMessage(repositories, room.id, first.id, '你好呀')
    await brain.onUserMessage(room.id, message)
    await vi.advanceTimersByTimeAsync(1500)

    expect(reply).toHaveBeenCalledTimes(1)
    expect(reply.mock.calls[0]?.[0]).toMatchObject({ moodText: expect.stringContaining('心情很好') })
  })

  it('gives pet-dm rooms a fallback mood tone without a pet row', async () => {
    const { repositories, first } = await createPairRoom()
    const dmRoom = await repositories.rooms.createPetDm(first.id)
    const reply = vi.fn(async (_context: { moodText?: string; roomType?: string }) => '汪')
    const brain = createPetBrain({
      repositories,
      ai: { reply, extractMemory: async () => null },
      emit: vi.fn()
    })

    const message = await storeUserMessage(repositories, dmRoom.id, first.id, '在干嘛')
    await brain.onUserMessage(dmRoom.id, message)

    expect(reply).toHaveBeenCalledTimes(1)
    const context = reply.mock.calls[0]?.[0]
    expect(context).toMatchObject({ roomType: 'pet_dm', moodText: expect.any(String) })
  })
})
