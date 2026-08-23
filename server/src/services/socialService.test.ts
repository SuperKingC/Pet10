import { describe, expect, it, vi } from 'vitest'
import { createMemoryRepositories } from '../repositories/memoryRepositories.js'
import { createSocialService } from './socialService.js'

function createService() {
  const repositories = createMemoryRepositories()
  const ai = {
    reply: vi.fn(async () => 'unused'),
    extractMemory: vi.fn(async () => null)
  }
  const social = createSocialService({ repositories, ai, emit: vi.fn() })
  return { repositories, social, ai }
}

describe('personal daily fortune', () => {
  it('uses the Asia/Shanghai calendar day around local midnight', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-07T16:30:00.000Z'))
    try {
      const { repositories, social } = createService()
      const user = await repositories.users.create({ email: 'midnight@example.com', username: 'midnight', displayName: 'Midnight' })
      await repositories.users.updateProfile(user.id, { birthday: '2000-08-08' })

      const fortune = await social.getTodayFortune(user.id)

      expect(fortune.day).toBe('2026-08-08')
    } finally {
      vi.useRealTimers()
    }
  })

  it('stores one stable fortune per user and day without a room', async () => {
    const { repositories, social, ai } = createService()
    const user = await repositories.users.create({ email: 'leo@example.com', username: 'leo', displayName: 'Leo' })
    await repositories.users.updateProfile(user.id, { birthday: '2000-08-08' })

    const first = await social.getTodayFortune(user.id)
    const second = await social.getTodayFortune(user.id)

    expect(second).toEqual(first)
    expect(first.userId).toBe(user.id)
    expect(first.content.zodiac).toBe('狮子座')
    expect(ai.reply).not.toHaveBeenCalled()
  })

  it('does not share fortune records between users', async () => {
    const { repositories, social } = createService()
    const leo = await repositories.users.create({ email: 'leo@example.com', username: 'leo', displayName: 'Leo' })
    const pisces = await repositories.users.create({ email: 'pisces@example.com', username: 'pisces', displayName: 'Pisces' })
    await repositories.users.updateProfile(leo.id, { birthday: '2000-08-08' })
    await repositories.users.updateProfile(pisces.id, { birthday: '2000-03-01' })

    const first = await social.getTodayFortune(leo.id)
    const second = await social.getTodayFortune(pisces.id)

    expect(first.userId).not.toBe(second.userId)
    expect(first.content.zodiac).toBe('狮子座')
    expect(second.content.zodiac).toBe('双鱼座')
  })

  it('requires the current user to have a birthday', async () => {
    const { repositories, social } = createService()
    const user = await repositories.users.create({ email: 'none@example.com', username: 'none', displayName: 'None' })

    await expect(social.getTodayFortune(user.id)).rejects.toThrow('birthday_required')
  })

  it('regenerates the current day after the user changes to a different zodiac', async () => {
    const { repositories, social } = createService()
    const user = await repositories.users.create({ email: 'changed@example.com', username: 'changed', displayName: 'Changed' })
    await repositories.users.updateProfile(user.id, { birthday: '2000-08-08' })
    const first = await social.getTodayFortune(user.id)

    await repositories.users.updateProfile(user.id, { birthday: '2000-03-01' })
    const second = await social.getTodayFortune(user.id)

    expect(first.content.zodiac).toBe('狮子座')
    expect(second.content.zodiac).toBe('双鱼座')
    expect(second.content).not.toEqual(first.content)
  })

  it('requires birthday even when a valid fortune was already cached today', async () => {
    const { repositories, social } = createService()
    const user = await repositories.users.create({ email: 'cleared@example.com', username: 'cleared', displayName: 'Cleared' })
    await repositories.users.updateProfile(user.id, { birthday: '2000-08-08' })
    await social.getTodayFortune(user.id)

    await repositories.users.updateProfile(user.id, { birthday: null })

    await expect(social.getTodayFortune(user.id)).rejects.toThrow('birthday_required')
  })

  it('replaces invalid stored content with a valid deterministic fortune', async () => {
    const { repositories, social } = createService()
    const user = await repositories.users.create({ email: 'repair@example.com', username: 'repair', displayName: 'Repair' })
    await repositories.users.updateProfile(user.id, { birthday: '2000-08-08' })
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date())
    await repositories.fortunes.createForUser(user.id, today, {
      zodiac: '狮子座',
      overall: { rating: 4, summary: '旧版摘要' },
      love: { rating: 3, text: '旧版感情短句' },
      workStudy: { rating: 4, text: '旧版工作学习短句' },
      wealth: { rating: 2, text: '旧版财运短句' },
      health: { rating: 5, text: '旧版健康短句' },
      luckyColor: { name: '雾霾蓝', hex: '#7892A8' },
      luckyNumber: 8,
      dailyTip: '旧版提示'
    } as never)

    const fortune = await social.getTodayFortune(user.id)

    expect(fortune.content.overall.rating).toBeGreaterThanOrEqual(1)
    expect(fortune.content.overall.rating).toBeLessThanOrEqual(5)
    expect(fortune.content.overall.summary.length).toBeGreaterThan(8)
    expect(fortune.content.luckyColor.hex).toMatch(/^#[0-9A-F]{6}$/)
    expect(fortune.content.schemaVersion).toBe(2)
    expect(fortune.content.love.single.length).toBeGreaterThanOrEqual(70)
    expect(fortune.content.love.partnered.length).toBeGreaterThanOrEqual(70)
  })
})

describe('room anniversaries', () => {
  async function createPairRoom(repositories: ReturnType<typeof createMemoryRepositories>) {
    const me = await repositories.users.create({ email: 'me@example.com', username: 'me', displayName: '我' })
    const friend = await repositories.users.create({ email: 'friend@example.com', username: 'friend', displayName: '好友' })
    const relationship = await repositories.relationships.create(me.id, friend.id)
    await repositories.relationships.accept(relationship.id)
    const room = await repositories.rooms.createForRelationship(relationship.id)
    return { me, friend, room }
  }

  const input = { name: '恋爱纪念日', icon: 'heart', note: '在一起', day: '2025-02-14', repeatRule: 'yearly' as const }

  it('creates and lists anniversaries for room members', async () => {
    const { repositories, social } = createService()
    const { me, room } = await createPairRoom(repositories)

    const created = await social.createAnniversary(room.id, me.id, input)
    const list = await social.listAnniversaries(room.id, me.id)

    expect(created.name).toBe('恋爱纪念日')
    expect(created.repeatRule).toBe('yearly')
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe(created.id)
  })

  it('updates an anniversary', async () => {
    const { repositories, social } = createService()
    const { me, room } = await createPairRoom(repositories)
    const created = await social.createAnniversary(room.id, me.id, input)

    const updated = await social.updateAnniversary(room.id, me.id, created.id, { icon: 'star', note: '' })

    expect(updated?.icon).toBe('star')
    expect(updated?.note).toBe('')
    expect(updated?.name).toBe('恋爱纪念日')
  })

  it('deletes an anniversary', async () => {
    const { repositories, social } = createService()
    const { me, room } = await createPairRoom(repositories)
    const created = await social.createAnniversary(room.id, me.id, input)

    await social.deleteAnniversary(room.id, me.id, created.id)

    expect(await social.listAnniversaries(room.id, me.id)).toHaveLength(0)
  })

  it('rejects users outside the room', async () => {
    const { repositories, social } = createService()
    const { room } = await createPairRoom(repositories)
    const stranger = await repositories.users.create({ email: 'x@example.com', username: 'x', displayName: 'X' })

    await expect(social.createAnniversary(room.id, stranger.id, input)).rejects.toThrow('room_forbidden')
    await expect(social.listAnniversaries(room.id, stranger.id)).rejects.toThrow('room_forbidden')
  })
})
