import { describe, expect, it, vi } from 'vitest'
import { createMemoryRepositories } from '../repositories/memoryRepositories.js'
import { createReminderService } from './reminderService.js'

async function createContext() {
  const repositories = createMemoryRepositories()
  const user = await repositories.users.create({
    email: 'owner@example.com',
    username: 'owner',
    displayName: '主人'
  })
  const room = await repositories.rooms.createPetDm(user.id)
  return { repositories, user, room }
}

describe('reminder service', () => {
  it('creates a reminder immediately without confirmation', async () => {
    const { repositories, user, room } = await createContext()
    const emit = vi.fn()
    const service = createReminderService({
      repositories,
      emit,
      emitUser: vi.fn(),
      notifyPush: vi.fn(),
      now: () => new Date('2026-08-12T02:00:00.000Z')
    })

    await expect(service.handleMessage(room.id, user.id, '30分钟后提醒我关火')).resolves.toBe(true)

    expect(emit).toHaveBeenCalledWith(room.id, 'message.created', expect.objectContaining({
      text: expect.stringContaining('已设置')
    }))
    const due = await repositories.tasks.claimDue(new Date('2026-08-12T02:30:00.000Z'), 10)
    expect(due).toHaveLength(1)
    expect(due[0]).toMatchObject({ content: '关火', scheduleType: 'once' })
  })

  it('asks for a concrete time and does not create an ambiguous reminder', async () => {
    const { repositories, user, room } = await createContext()
    const emit = vi.fn()
    const service = createReminderService({
      repositories,
      emit,
      emitUser: vi.fn(),
      notifyPush: vi.fn()
    })

    await expect(service.handleMessage(room.id, user.id, '提醒我交作业')).resolves.toBe(true)

    expect(emit).toHaveBeenCalledWith(room.id, 'message.created', expect.objectContaining({
      text: expect.stringContaining('具体时间')
    }))
    expect(await repositories.tasks.claimDue(new Date('2100-01-01T00:00:00.000Z'), 10)).toHaveLength(0)
  })

  it('delivers a due reminder once through chat, notification and push', async () => {
    const { repositories, user, room } = await createContext()
    const emit = vi.fn()
    const emitUser = vi.fn()
    const notifyPush = vi.fn()
    await repositories.tasks.create({
      roomId: room.id,
      userId: user.id,
      content: '关火',
      scheduleType: 'once',
      nextRunAt: new Date('2026-08-12T02:30:00.000Z')
    })
    const service = createReminderService({ repositories, emit, emitUser, notifyPush })

    await service.runDue(new Date('2026-08-12T02:30:00.000Z'))
    await service.runDue(new Date('2026-08-12T02:31:00.000Z'))

    expect(emit).toHaveBeenCalledTimes(1)
    expect(emitUser).toHaveBeenCalledTimes(1)
    expect(notifyPush).toHaveBeenCalledTimes(1)
    expect(await repositories.notifications.unreadCount(user.id)).toBe(1)
  })

  it('reschedules a recurring reminder after delivery', async () => {
    const { repositories, user, room } = await createContext()
    await repositories.tasks.create({
      roomId: room.id,
      userId: user.id,
      content: '睡觉',
      scheduleType: 'daily',
      nextRunAt: new Date('2026-08-12T15:00:00.000Z')
    })
    const service = createReminderService({
      repositories,
      emit: vi.fn(),
      emitUser: vi.fn(),
      notifyPush: vi.fn()
    })

    await service.runDue(new Date('2026-08-12T15:00:00.000Z'))

    const next = await repositories.tasks.claimDue(new Date('2026-08-13T15:00:00.000Z'), 10)
    expect(next).toHaveLength(1)
    expect(next[0].nextRunAt).toEqual(new Date('2026-08-13T15:00:00.000Z'))
  })

  it('cancels every pending reminder in the room on request', async () => {
    const { repositories, user, room } = await createContext()
    const emit = vi.fn()
    await repositories.tasks.create({
      roomId: room.id,
      userId: user.id,
      content: '关火',
      scheduleType: 'once',
      nextRunAt: new Date('2026-08-12T02:30:00.000Z')
    })
    await repositories.tasks.create({
      roomId: room.id,
      userId: user.id,
      content: '取快递',
      scheduleType: 'daily',
      nextRunAt: new Date('2026-08-12T10:00:00.000Z')
    })
    const service = createReminderService({ repositories, emit, emitUser: vi.fn(), notifyPush: vi.fn() })

    await expect(service.handleMessage(room.id, user.id, '取消提醒')).resolves.toBe(true)

    expect(emit).toHaveBeenCalledWith(room.id, 'message.created', expect.objectContaining({
      text: expect.stringContaining('取消了 2 条提醒')
    }))
    expect(await repositories.tasks.listPendingByRoom(room.id)).toHaveLength(0)
    expect(await repositories.tasks.claimDue(new Date('2026-08-13T00:00:00.000Z'), 10)).toHaveLength(0)
  })

  it('tells the user there is nothing to cancel', async () => {
    const { repositories, user, room } = await createContext()
    const emit = vi.fn()
    const service = createReminderService({ repositories, emit, emitUser: vi.fn(), notifyPush: vi.fn() })

    await expect(service.handleMessage(room.id, user.id, '取消提醒')).resolves.toBe(true)

    expect(emit).toHaveBeenCalledWith(room.id, 'message.created', expect.objectContaining({
      text: expect.stringContaining('没有待执行的提醒')
    }))
  })

  it('falls back to AI parsing when the fixed template cannot parse', async () => {
    const { repositories, user, room } = await createContext()
    const emit = vi.fn()
    const parseReminderFallback = vi.fn(async () => ({
      content: '水烧开后关火',
      scheduleType: 'once' as const,
      nextRunAt: new Date('2026-08-12T03:00:00.000Z')
    }))
    const service = createReminderService({
      repositories,
      emit,
      emitUser: vi.fn(),
      notifyPush: vi.fn(),
      ai: { parseReminderFallback, composeReminderAnnouncement: vi.fn(async () => null) }
    })

    await expect(service.handleMessage(room.id, user.id, '记得等水烧开了提醒我关火')).resolves.toBe(true)

    expect(parseReminderFallback).toHaveBeenCalledTimes(1)
    expect(emit).toHaveBeenCalledWith(room.id, 'message.created', expect.objectContaining({
      text: expect.stringContaining('提醒已设置')
    }))
    expect(await repositories.tasks.listPendingByRoom(room.id)).toHaveLength(1)
  })

  it('announces due reminders with the AI wording when available', async () => {
    const { repositories, user, room } = await createContext()
    await repositories.tasks.create({
      roomId: room.id,
      userId: user.id,
      content: '关火',
      scheduleType: 'once',
      nextRunAt: new Date('2026-08-12T02:30:00.000Z')
    })
    const service = createReminderService({
      repositories,
      emit: vi.fn(),
      emitUser: vi.fn(),
      notifyPush: vi.fn(),
      ai: {
        parseReminderFallback: vi.fn(async () => null),
        composeReminderAnnouncement: vi.fn(async () => '汪！锅还在烧呢，快去关火！')
      }
    })

    await service.runDue(new Date('2026-08-12T02:30:00.000Z'))

    const recent = await repositories.messages.listRecent(room.id, 5)
    expect(recent[recent.length - 1]?.text).toBe('汪！锅还在烧呢，快去关火！')
  })
})
