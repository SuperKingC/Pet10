import { describe, expect, it } from 'vitest'
import { createMemoryRepositories } from '../repositories/memoryRepositories.js'
import { createFriendshipService } from './friendshipService.js'
import { createNestTaskService } from './nestTaskService.js'
import { ACTION_COST, ITEM_CATALOG, NEST_TASK_LIMIT, REWARD_LIMITS, STARTER_POUCH } from '../domain/itemCatalog.js'
import { applyTaskReward, isDoneToday, validateReward } from '../domain/nestTaskRules.js'

async function createPairRoom() {
  const repositories = createMemoryRepositories()
  const user = await repositories.users.create({ email: 'a@example.com', username: 'a', displayName: '阿柴' })
  const friend = await repositories.users.create({ email: 'b@example.com', username: 'b', displayName: '豆豆' })
  const friendshipService = createFriendshipService(repositories)
  const relationship = await friendshipService.sendRequest(user.id, friend.username)
  await friendshipService.acceptRequest(friend.id, relationship.id)
  const room = await repositories.rooms.findByRelationshipId(relationship.id)
  if (!room) throw new Error('room missing')
  return { repositories, user, friend, room }
}

describe('item catalog', () => {
  it('maps feed/play/clean to items and leaves sleep free', () => {
    expect(ACTION_COST.feed).toBe('dog_food')
    expect(ACTION_COST.play).toBe('ball')
    expect(ACTION_COST.clean).toBe('soap')
    expect(ACTION_COST.sleep).toBeUndefined()
  })

  it('catalog covers all cost items with names', () => {
    for (const itemId of Object.values(ACTION_COST)) {
      expect(ITEM_CATALOG[itemId].name.length).toBeGreaterThan(0)
    }
  })

  it('starter pouch grants every item', () => {
    for (const itemId of Object.values(ACTION_COST)) {
      expect(STARTER_POUCH[itemId]).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('nest task rules', () => {
  it('daily task resets on a new day', () => {
    const task = { repeatRule: 'daily' as const, lastCompletedDay: '2026-08-29' }
    expect(isDoneToday(task, '2026-08-29')).toBe(true)
    expect(isDoneToday(task, '2026-08-30')).toBe(false)
  })

  it('weekly task stays done through the week and resets on Monday', () => {
    const task = { repeatRule: 'weekly' as const, lastCompletedDay: '2026-08-24' }
    expect(isDoneToday(task, '2026-08-29')).toBe(true)
    expect(isDoneToday(task, '2026-08-31')).toBe(false)
  })

  it('once task stays done forever', () => {
    const task = { repeatRule: 'none' as const, lastCompletedDay: '2026-01-01' }
    expect(isDoneToday(task, '2026-08-29')).toBe(true)
  })

  it('rejects rewards above repeat limits', () => {
    expect(validateReward('daily', [{ itemId: 'dog_food', count: 4 }], 10, REWARD_LIMITS.daily)).toBe(false)
    expect(validateReward('daily', [{ itemId: 'dog_food', count: 3 }], 21, REWARD_LIMITS.daily)).toBe(false)
    expect(validateReward('daily', [{ itemId: 'dog_food', count: 3 }], 20, REWARD_LIMITS.daily)).toBe(true)
  })

  it('applies exp rewards with level ups', () => {
    const result = applyTaskReward({ level: 1, experience: 95, experienceToNextLevel: 100 }, 10)
    expect(result.level).toBe(2)
    expect(result.experience).toBe(5)
    expect(result.leveledUp).toBe(true)
  })
})

describe('nest task service', () => {
  it('grants starter pouch once on first list', async () => {
    const { repositories, user, room } = await createPairRoom()
    const service = createNestTaskService(repositories)
    const first = await service.inventory(room.id, user.id)
    expect(first.items.find((item) => item.itemId === 'dog_food')?.count).toBe(STARTER_POUCH.dog_food)
    // 再取一次不重复发放
    const second = await service.inventory(room.id, user.id)
    expect(second.items.find((item) => item.itemId === 'dog_food')?.count).toBe(STARTER_POUCH.dog_food)
  })

  it('completes a task, grants items and pet exp once per period', async () => {
    const { repositories, user, room } = await createPairRoom()
    const service = createNestTaskService(repositories)
    const task = await service.create(room.id, user.id, {
      title: '陪小多利散步',
      repeatRule: 'daily',
      rewardItems: [{ itemId: 'dog_food', count: 1 }],
      rewardExp: 10
    })
    const before = await service.inventory(room.id, user.id)
    const result = await service.complete(room.id, user.id, task.id)
    expect(result.grantedItems).toEqual([{ itemId: 'dog_food', count: 1 }])
    expect(result.pet.experience).toBe(10)
    expect(result.leveledUp).toBe(false)

    const after = await service.inventory(room.id, user.id)
    expect(after.items.find((item) => item.itemId === 'dog_food')?.count)
      .toBe((before.items.find((item) => item.itemId === 'dog_food')?.count ?? 0) + 1)

    await expect(service.complete(room.id, user.id, task.id)).rejects.toThrow('nest_task_already_done')
    const list = await service.list(room.id, user.id)
    expect(list.find((item) => item.id === task.id)?.doneToday).toBe(true)
    expect(list.find((item) => item.id === task.id)?.doneByName).toBe('阿柴')
  })

  it('blocks pet actions when the mapped item is out of stock and consumes when available', async () => {
    const { repositories, user, room } = await createPairRoom()
    const service = createNestTaskService(repositories)
    // 清空新手包，制造 0 库存
    while (await repositories.inventory.consume(room.id, 'dog_food'));
    await expect(service.consumeForAction(room.id, user.id, 'feed')).rejects.toThrow('insufficient_item')
    // 睡觉永远免费
    expect(await service.consumeForAction(room.id, user.id, 'sleep')).toBeNull()
    // 补货后可扣
    await repositories.inventory.add(room.id, 'dog_food', 1)
    expect(await service.consumeForAction(room.id, user.id, 'feed')).toBe('dog_food')
    expect(await repositories.inventory.consume(room.id, 'dog_food')).toBe(false)
  })

  it('enforces the active task limit', async () => {
    const { repositories, user, room } = await createPairRoom()
    const service = createNestTaskService(repositories)
    for (let index = 0; index < NEST_TASK_LIMIT; index++) {
      await service.create(room.id, user.id, {
        title: `任务${index}`,
        repeatRule: 'daily',
        rewardItems: [],
        rewardExp: 0
      })
    }
    await expect(service.create(room.id, user.id, {
      title: '超额任务',
      repeatRule: 'daily',
      rewardItems: [],
      rewardExp: 0
    })).rejects.toThrow('nest_task_limit')
  })

  it('rejects invalid rewards and non-members', async () => {
    const { repositories, user, friend, room } = await createPairRoom()
    const service = createNestTaskService(repositories)
    await expect(service.create(room.id, user.id, {
      title: '刷爆任务',
      repeatRule: 'daily',
      rewardItems: [{ itemId: 'dog_food', count: REWARD_LIMITS.daily.maxPerItem + 1 }],
      rewardExp: 0
    })).rejects.toThrow('invalid_reward')
    await expect(service.create(room.id, user.id, {
      title: '非法道具',
      repeatRule: 'daily',
      rewardItems: [{ itemId: 'diamond', count: 1 }],
      rewardExp: 0
    })).rejects.toThrow('invalid_item')

    const outsider = await repositories.users.create({ email: 'x@example.com', username: 'x', displayName: 'X' })
    await expect(service.list(room.id, outsider.id)).rejects.toThrow('room_forbidden')
    await expect(service.inventory(room.id, friend.id)).resolves.toBeTruthy()
  })
})
