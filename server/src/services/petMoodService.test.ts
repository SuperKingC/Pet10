import { describe, expect, it, vi } from 'vitest'
import { createMemoryRepositories } from '../repositories/memoryRepositories.js'
import { createFriendshipService } from './friendshipService.js'
import { createPetMoodService } from './petMoodService.js'
import { createPetMoodSweepService } from './petMoodSweepService.js'
import { MOOD_DECAY_AFTER_MS } from '../domain/petMoodRules.js'

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
  // 好友流程只建房间；心情引擎依赖宠物行，测试里显式创建
  const pet = await repositories.pets.createForRelationship(relationship.id, room.id)
  return { repositories, first, second, room, pet }
}

describe('pet mood service', () => {
  it('computes a mood context whose idle hours come from the last user attention', async () => {
    let currentTime = T0
    const { repositories, first, room, pet } = await createPairRoom(() => new Date(currentTime))
    const mood = createPetMoodService({ repositories, now: () => new Date(currentTime) })

    // 只有小窝动作、没有聊天：动作后 30 小时仍视为被冷落
    await repositories.petEvents.record(pet.id, first.id, 'feed')

    currentTime += 30 * HOUR_MS
    const context = await mood.getMoodContext(room.id)
    expect(context).toBeDefined()
    expect(context!.idleHours).toBeCloseTo(30, 1)
    expect(context!.state.key).toBe('bored')
  })

  it('ignores pet messages when measuring neglect', async () => {
    let currentTime = T0
    const { repositories, first, room } = await createPairRoom(() => new Date(currentTime))
    const mood = createPetMoodService({ repositories, now: () => new Date(currentTime) })

    await repositories.messages.create({ roomId: room.id, senderType: 'user', senderId: first.id, kind: 'text', text: '在吗' })
    currentTime += 2 * HOUR_MS
    await repositories.messages.create({ roomId: room.id, senderType: 'pet', kind: 'pet', text: '汪汪' })
    currentTime += 1 * HOUR_MS

    const context = await mood.getMoodContext(room.id)
    // 宠物自己的发言不算被理会：闲置按最后一条用户消息算 3 小时（若算宠物消息则是 1 小时）
    expect(context!.idleHours).toBeCloseTo(3, 1)
  })

  it('applies chat sentiment to the stored pet mood', async () => {
    let currentTime = T0
    const { repositories, room } = await createPairRoom(() => new Date(currentTime))
    const mood = createPetMoodService({ repositories, now: () => new Date(currentTime) })

    await mood.applyChatSentiment(room.id, '小多利你真棒！')
    let pet = await repositories.pets.findByRoomId(room.id)
    expect(pet!.mood).toBe(82)

    // 冷却窗口内：嫌弃不生效
    await mood.applyChatSentiment(room.id, '讨厌你！')
    pet = await repositories.pets.findByRoomId(room.id)
    expect(pet!.mood).toBe(82)

    currentTime += 2 * HOUR_MS
    await mood.applyChatSentiment(room.id, '讨厌你！')
    pet = await repositories.pets.findByRoomId(room.id)
    expect(pet!.mood).toBe(79)
  })

  it('decays an idle pet only past the threshold and stops at the floor', async () => {
    let currentTime = T0
    const { repositories, room } = await createPairRoom(() => new Date(currentTime))
    const mood = createPetMoodService({ repositories, now: () => new Date(currentTime) })

    await mood.decayIfIdle(room.id)
    expect((await repositories.pets.findByRoomId(room.id))!.mood).toBe(80)

    currentTime += MOOD_DECAY_AFTER_MS + 60 * 1000
    await mood.decayIfIdle(room.id)
    expect((await repositories.pets.findByRoomId(room.id))!.mood).toBe(75)

    // 衰减写入本身刷新了检查点：12 小时内不会重复衰减
    currentTime += MOOD_DECAY_AFTER_MS - 2 * 60 * 1000
    await mood.decayIfIdle(room.id)
    expect((await repositories.pets.findByRoomId(room.id))!.mood).toBe(75)

    currentTime += 3 * 60 * 1000
    await mood.decayIfIdle(room.id)
    expect((await repositories.pets.findByRoomId(room.id))!.mood).toBe(70)
  })

  it('decays to the floor and no further', async () => {
    let currentTime = T0
    const { repositories, room, pet } = await createPairRoom(() => new Date(currentTime))
    pet.mood = 12
    const mood = createPetMoodService({ repositories, now: () => new Date(currentTime) })

    currentTime += MOOD_DECAY_AFTER_MS + 60 * 1000
    await mood.decayIfIdle(room.id)
    expect((await repositories.pets.findByRoomId(room.id))!.mood).toBe(10)

    currentTime += 13 * HOUR_MS
    await mood.decayIfIdle(room.id)
    expect((await repositories.pets.findByRoomId(room.id))!.mood).toBe(10)
  })
})

describe('pet mood sweep', () => {
  it('decays every room with a pet and isolates per-room failures', async () => {
    let currentTime = T0
    const { repositories, room } = await createPairRoom(() => new Date(currentTime))
    const other = await repositories.users.create({ email: 'c@example.com', username: 'c', displayName: 'C' })
    const petDmRoom = await repositories.rooms.createPetDm(other.id)
    const mood = createPetMoodService({ repositories, now: () => new Date(currentTime) })
    const decayIfIdle = vi.fn(async (roomId: string) => {
      if (roomId === petDmRoom.id) throw new Error('boom')
      await mood.decayIfIdle(roomId)
    })
    const logError = vi.fn()
    const sweep = createPetMoodSweepService({ repositories, decayIfIdle, logError })

    currentTime += MOOD_DECAY_AFTER_MS + 60 * 1000
    await sweep.runOnce()

    expect(decayIfIdle).toHaveBeenCalledTimes(2)
    expect(logError).toHaveBeenCalledWith('pet mood decay failed', expect.any(Error))
    expect((await repositories.pets.findByRoomId(room.id))!.mood).toBe(75)
  })
})
