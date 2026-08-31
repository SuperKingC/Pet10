import { describe, expect, it, vi } from 'vitest'
import { createMemoryRepositories } from '../repositories/memoryRepositories.js'
import { createFriendshipService } from './friendshipService.js'
import { createPetMoodService } from './petMoodService.js'
import { createProactiveSweepService } from './proactiveSweepService.js'

const HOUR_MS = 60 * 60 * 1000
const T0 = new Date('2026-08-31T10:00:00.000Z').getTime()

async function createPairRoom(now: () => Date) {
  const repositories = createMemoryRepositories({ now })
  const first = await repositories.users.create({ email: 'a@example.com', username: 'a', displayName: 'A' })
  const second = await repositories.users.create({ email: 'b@example.com', username: 'b', displayName: 'B' })
  const friendship = createFriendshipService(repositories)
  const relationship = await friendship.sendRequest(first.id, second.username)
  await friendship.acceptRequest(second.id, relationship.id)
  const room = await repositories.rooms.findByRelationshipId(relationship.id)
  if (!room) throw new Error('room missing')
  await repositories.pets.createForRelationship(relationship.id, room.id)
  return { repositories, first, room }
}

function baseAi() {
  return {
    composeProactiveMessage: vi.fn(async () => '汪，想你们了！'),
    composeMomentPost: vi.fn(async () => '想你们的一天。')
  }
}

describe('proactive sweep service', () => {
  it('sends a proactive message after long silence and emits it', async () => {
    let currentTime = T0 - 25 * HOUR_MS
    const { repositories, first, room } = await createPairRoom(() => new Date(currentTime))
    await repositories.messages.create({ roomId: room.id, senderType: 'user', senderId: first.id, kind: 'text', text: '我先去忙啦' })
    currentTime = T0
    const ai = baseAi()
    const emit = vi.fn()
    const mood = createPetMoodService({ repositories, now: () => new Date(currentTime) })
    const sweep = createProactiveSweepService({ repositories, ai, emit, mood, now: () => new Date(currentTime) })

    await sweep.runOnce()

    expect(ai.composeProactiveMessage).toHaveBeenCalledWith(expect.objectContaining({
      silenceHours: expect.closeTo(25, 1)
    }))
    expect(emit).toHaveBeenCalledWith(room.id, 'message.created', expect.objectContaining({
      senderType: 'pet',
      text: '汪，想你们了！'
    }))
  })

  it('stays quiet while the room is still active', async () => {
    let currentTime = T0 - 2 * HOUR_MS
    const { repositories, first, room } = await createPairRoom(() => new Date(currentTime))
    await repositories.messages.create({ roomId: room.id, senderType: 'user', senderId: first.id, kind: 'text', text: '在呢在呢' })
    currentTime = T0
    const ai = baseAi()
    const mood = createPetMoodService({ repositories, now: () => new Date(currentTime) })
    const sweep = createProactiveSweepService({ repositories, ai, emit: vi.fn(), mood, now: () => new Date(currentTime) })

    await sweep.runOnce()

    expect(ai.composeProactiveMessage).not.toHaveBeenCalled()
    expect(ai.composeMomentPost).not.toHaveBeenCalled()
  })

  it('reaches out sooner when the pet feels sulky', async () => {
    let currentTime = T0 - 15 * HOUR_MS
    const { repositories, first, room } = await createPairRoom(() => new Date(currentTime))
    await repositories.messages.create({ roomId: room.id, senderType: 'user', senderId: first.id, kind: 'text', text: '出去一趟' })
    const pet = await repositories.pets.findByRoomId(room.id)
    if (!pet) throw new Error('pet missing')
    pet.mood = 20 // 委屈：闲置 12 小时就忍不住找人
    currentTime = T0
    const ai = baseAi()
    const mood = createPetMoodService({ repositories, now: () => new Date(currentTime) })
    const sweep = createProactiveSweepService({ repositories, ai, emit: vi.fn(), mood, now: () => new Date(currentTime) })

    await sweep.runOnce()

    expect(ai.composeProactiveMessage).toHaveBeenCalledTimes(1)
  })

  it('waits the full window when the pet is in a good mood', async () => {
    let currentTime = T0 - 15 * HOUR_MS
    const { repositories, first, room } = await createPairRoom(() => new Date(currentTime))
    await repositories.messages.create({ roomId: room.id, senderType: 'user', senderId: first.id, kind: 'text', text: '出去一趟' })
    const pet = await repositories.pets.findByRoomId(room.id)
    if (!pet) throw new Error('pet missing')
    pet.mood = 90 // 心情好：默认等满 24 小时
    currentTime = T0
    const ai = baseAi()
    const mood = createPetMoodService({ repositories, now: () => new Date(currentTime) })
    const sweep = createProactiveSweepService({ repositories, ai, emit: vi.fn(), mood, now: () => new Date(currentTime) })

    await sweep.runOnce()

    expect(ai.composeProactiveMessage).not.toHaveBeenCalled()
  })

  it('posts a circle moment on the next sweep after the chat cooldown takes over', async () => {
    let currentTime = T0 - 50 * HOUR_MS
    const { repositories, first, room } = await createPairRoom(() => new Date(currentTime))
    await repositories.messages.create({ roomId: room.id, senderType: 'user', senderId: first.id, kind: 'text', text: '好久不见' })
    currentTime = T0
    const ai = baseAi()
    const emit = vi.fn()
    const mood = createPetMoodService({ repositories, now: () => new Date(currentTime) })
    const sweep = createProactiveSweepService({ repositories, ai, emit, mood, now: () => new Date(currentTime) })

    // 第一轮：先找人说话
    await sweep.runOnce()
    expect(emit).toHaveBeenCalledWith(room.id, 'message.created', expect.objectContaining({ senderType: 'pet' }))
    // 第二轮：刚说过话被 12 小时冷却挡住，沉默太久改发朋友圈
    await sweep.runOnce()
    expect(ai.composeMomentPost).toHaveBeenCalledTimes(1)
    expect(emit).toHaveBeenCalledWith(room.id, 'post.new', expect.objectContaining({
      authorType: 'pet',
      text: '想你们的一天。'
    }))
  })

  it('falls back to template lines when composing is unavailable', async () => {
    let currentTime = T0 - 30 * HOUR_MS
    const { repositories, first, room } = await createPairRoom(() => new Date(currentTime))
    await repositories.messages.create({ roomId: room.id, senderType: 'user', senderId: first.id, kind: 'text', text: '最近很忙' })
    currentTime = T0
    const ai = { composeProactiveMessage: vi.fn(async () => null), composeMomentPost: vi.fn(async () => null) }
    const emit = vi.fn()
    const mood = createPetMoodService({ repositories, now: () => new Date(currentTime) })
    const sweep = createProactiveSweepService({ repositories, ai, emit, mood, now: () => new Date(currentTime) })

    await sweep.runOnce()

    expect(emit).toHaveBeenCalledWith(room.id, 'message.created', expect.objectContaining({
      senderType: 'pet',
      text: expect.any(String)
    }))
  })

  it('does nothing in rooms where proactive mode is disabled', async () => {
    let currentTime = T0 - 60 * HOUR_MS
    const { repositories, first, room } = await createPairRoom(() => new Date(currentTime))
    await repositories.messages.create({ roomId: room.id, senderType: 'user', senderId: first.id, kind: 'text', text: '关掉主动模式' })
    await repositories.rooms.setProactive(room.id, false)
    currentTime = T0
    const ai = baseAi()
    const mood = createPetMoodService({ repositories, now: () => new Date(currentTime) })
    const sweep = createProactiveSweepService({ repositories, ai, emit: vi.fn(), mood, now: () => new Date(currentTime) })

    await sweep.runOnce()

    expect(ai.composeProactiveMessage).not.toHaveBeenCalled()
    expect(ai.composeMomentPost).not.toHaveBeenCalled()
  })
})
