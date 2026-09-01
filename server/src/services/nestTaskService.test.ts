import { describe, expect, it, vi } from 'vitest'
import { createMemoryRepositories } from '../repositories/memoryRepositories.js'
import { createFriendshipService } from './friendshipService.js'
import { createNestTaskService } from './nestTaskService.js'
import { NEST_TASK_DEFS } from '../domain/nestTaskCatalog.js'
import { ACTION_COST, STARTER_POUCH } from '../domain/itemCatalog.js'

async function createPairRoom(options?: { withPet?: boolean }) {
  const repositories = createMemoryRepositories()
  const user = await repositories.users.create({ email: 'a@example.com', username: 'a', displayName: '阿柴' })
  const friend = await repositories.users.create({ email: 'b@example.com', username: 'b', displayName: '豆豆' })
  const friendshipService = createFriendshipService(repositories)
  const relationship = await friendshipService.sendRequest(user.id, friend.username)
  await friendshipService.acceptRequest(friend.id, relationship.id)
  const room = await repositories.rooms.findByRelationshipId(relationship.id)
  if (!room) throw new Error('room missing')
  if (options?.withPet !== false) await repositories.pets.createForRelationship(relationship.id, room.id)
  return { repositories, user, friend, room }
}

describe('preset task catalog', () => {
  it('task keys are unique and targets positive', () => {
    const keys = NEST_TASK_DEFS.map((def) => def.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const def of NEST_TASK_DEFS) {
      expect(def.target).toBeGreaterThanOrEqual(1)
      expect(def.rewardItems.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('achievement chains point to existing keys', () => {
    const keys = new Set(NEST_TASK_DEFS.map((def) => def.key))
    for (const def of NEST_TASK_DEFS) {
      if (def.requires) expect(keys.has(def.requires)).toBe(true)
    }
  })

  it('daily checkin task exists with item-only rewards', () => {
    const checkin = NEST_TASK_DEFS.find((def) => def.key === 'daily_checkin')
    expect(checkin?.scope).toBe('daily')
    expect(checkin?.metric).toBe('checkin')
  })
})

describe('nest task service (preset tasks)', () => {
  it('lists daily and achievement tasks with zero initial progress', async () => {
    const { repositories, user, room } = await createPairRoom()
    const service = createNestTaskService(repositories)
    const tasks = await service.list(room.id, user.id)
    const daily = tasks.filter((task) => task.scope === 'daily')
    const achievements = tasks.filter((task) => task.scope === 'achievement')
    expect(daily.length).toBeGreaterThanOrEqual(4)
    expect(achievements.length).toBeGreaterThanOrEqual(5)
    for (const task of tasks) {
      expect(task.progress).toBe(0)
      expect(task.claimed).toBe(false)
      expect(task.rewardNames.length).toBeGreaterThanOrEqual(1)
    }
    // 成就链未达成时后面的签到成就锁定
    const checkin7 = tasks.find((task) => task.key === 'ach_checkin_7')
    expect(checkin7?.locked).toBe(true)
  })

  it('checkin marks the daily task done once per day and feeds the achievement chain', async () => {
    const { repositories, user, friend, room } = await createPairRoom()
    const service = createNestTaskService(repositories)
    await service.checkin(room.id, user.id)
    await expect(service.checkin(room.id, friend.id)).rejects.toThrow('checkin_already_done')

    const tasks = await service.list(room.id, user.id)
    const dailyCheckin = tasks.find((task) => task.key === 'daily_checkin')
    expect(dailyCheckin?.complete).toBe(true)

    // 成就签到未达成（只签 1 天）→ 不完整；未领前置 → 锁定
    await expect(service.claim(room.id, user.id, 'ach_checkin_3')).rejects.toThrow('nest_task_locked')
    // 领每日签到奖励
    const claim = await service.claim(room.id, user.id, 'daily_checkin')
    expect(claim.grantedItems).toEqual([{ itemId: 'dog_food', count: 1 }])
    await expect(service.claim(room.id, user.id, 'daily_checkin')).rejects.toThrow('nest_task_already_claimed')
  })

  it('records pet action progress and grants claimable daily rewards', async () => {
    const { repositories, user, room } = await createPairRoom()
    const service = createNestTaskService(repositories)
    const onReward = vi.fn()
    const watched = createNestTaskService(repositories, { onRewardGranted: onReward })
    await watched.recordActionProgress(room.id, 'feed')
    const tasks = await watched.list(room.id, user.id)
    const feedTask = tasks.find((task) => task.key === 'daily_feed')
    expect(feedTask?.complete).toBe(true)
    const before = (await watched.inventory(room.id, user.id)).items.find((item) => item.itemId === 'dog_food')?.count ?? 0
    await watched.claim(room.id, user.id, 'daily_feed')
    const after = (await watched.inventory(room.id, user.id)).items.find((item) => item.itemId === 'dog_food')?.count ?? 0
    expect(after).toBe(before + 1)
    expect(onReward).toHaveBeenCalled()
    await expect(watched.claim(room.id, user.id, 'daily_feed')).rejects.toThrow('nest_task_already_claimed')
  })

  it('achievement feed task completes from accumulated pet_events and unlocks by claim', async () => {
    const { repositories, user, room } = await createPairRoom()
    const service = createNestTaskService(repositories)
    const pet = await repositories.pets.findByRoomId(room.id)
    if (!pet) throw new Error('pet missing')
    for (let index = 0; index < 10; index++) await repositories.petEvents.record(pet.id, user.id, 'feed')
    const tasks = await service.list(room.id, user.id)
    const feed10 = tasks.find((task) => task.key === 'ach_feed_10')
    const feed50 = tasks.find((task) => task.key === 'ach_feed_50')
    expect(feed10?.complete).toBe(true)
    expect(feed10?.claimed).toBe(false)
    expect(feed50?.complete).toBe(false)
    await service.claim(room.id, user.id, 'ach_feed_10')
    const after = await service.list(room.id, user.id)
    expect(after.find((task) => task.key === 'ach_feed_10')?.claimed).toBe(true)
    // 前置 ach_feed_10 已领取 → ach_feed_50 解锁（但 10<50 仍未完成）
    expect(after.find((task) => task.key === 'ach_feed_50')?.locked).toBe(false)
    expect(after.find((task) => task.key === 'ach_feed_50')?.complete).toBe(false)
  })

  it('consumeForAction still gates feed/play/clean on inventory; sleep free', async () => {
    const { repositories, user, room } = await createPairRoom()
    const service = createNestTaskService(repositories)
    while (await repositories.inventory.consume(room.id, 'dog_food'));
    await expect(service.consumeForAction(room.id, user.id, 'feed')).rejects.toThrow('insufficient_item')
    expect(await service.consumeForAction(room.id, user.id, 'sleep')).toBeNull()
    expect(ACTION_COST.sleep).toBeUndefined()
    expect(STARTER_POUCH.dog_food).toBeGreaterThan(0)
    expect(STARTER_POUCH.bone).toBeGreaterThan(0)
  })

  it('outsiders cannot list or claim', async () => {
    const { repositories, user, room } = await createPairRoom()
    const service = createNestTaskService(repositories)
    const outsider = await repositories.users.create({ email: 'x@example.com', username: 'x', displayName: 'X' })
    await expect(service.list(room.id, outsider.id)).rejects.toThrow('room_forbidden')
    await expect(service.claim(room.id, outsider.id, 'daily_checkin')).rejects.toThrow('room_forbidden')
    await expect(service.checkin(room.id, user.id)).resolves.toBeTruthy()
  })
})
