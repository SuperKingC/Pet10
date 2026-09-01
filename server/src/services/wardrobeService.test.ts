import { describe, expect, it, vi } from 'vitest'
import { createMemoryRepositories } from '../repositories/memoryRepositories.js'
import { createFriendshipService } from './friendshipService.js'
import { createWardrobeService, type MatchSettledEvent } from './wardrobeService.js'

const FIXED_NOW = new Date('2026-08-30T10:00:00Z')

async function createPairRoom() {
  const repositories = createMemoryRepositories()
  const user = await repositories.users.create({ email: 'a@example.com', username: 'a', displayName: '阿柴' })
  const friend = await repositories.users.create({ email: 'b@example.com', username: 'b', displayName: '豆豆' })
  const friendshipService = createFriendshipService(repositories)
  const relationship = await friendshipService.sendRequest(user.id, friend.username)
  await friendshipService.acceptRequest(friend.id, relationship.id)
  const room = await repositories.rooms.findByRelationshipId(relationship.id)
  if (!room) throw new Error('room missing')
  await repositories.pets.createForRelationship(relationship.id, room.id)
  return { repositories, user, friend, room }
}

function createService(repositories: ReturnType<typeof createMemoryRepositories>, settled: MatchSettledEvent[] = []) {
  return createWardrobeService(repositories, {
    now: () => FIXED_NOW,
    onMatchSettled: (event) => settled.push(event)
  })
}

describe('wardrobe service', () => {
  it('returns catalog with day-one unlocks and empty match state', async () => {
    const { repositories, user, room } = await createPairRoom()
    const service = createService(repositories)
    const view = await service.get(room.id, user.id)
    expect(view.equipped).toBe('default')
    expect(view.items).toHaveLength(9)
    expect(view.items.filter((item) => item.unlocked).map((item) => item.key)).toEqual(['default', 'scarf', 'hoodie'])
    expect(view.match).toEqual({ myPick: null, partnerPicked: false, matchedToday: false, streak: 0, bestStreak: 0 })
  })

  it('rejects equipping a locked suit and allows it once unlocked', async () => {
    const { repositories, user, room } = await createPairRoom()
    const service = createService(repositories)
    await expect(service.setEquipped(room.id, user.id, 'overalls')).rejects.toThrow('wardrobe_locked')
    await expect(service.setEquipped(room.id, user.id, 'nonexistent')).rejects.toThrow('invalid_suit')
    // 五次领奖事件 → 背带裤解锁
    const pet = await repositories.pets.findByRoomId(room.id)
    for (let index = 0; index < 5; index += 1) {
      await repositories.petEvents.record(pet!.id, user.id, 'task_claim')
    }
    const result = await service.setEquipped(room.id, user.id, 'overalls')
    expect(result.equipped).toBe('overalls')
    const view = await service.get(room.id, user.id)
    expect(view.equipped).toBe('overalls')
    expect(view.items.find((item) => item.key === 'overalls')?.unlocked).toBe(true)
  })

  it('saves and returns an outfit with per-category pieces', async () => {
    const { repositories, user, room } = await createPairRoom()
    const service = createService(repositories)
    // 帽子未解锁（需 15 次任务）→ 整套拒绝
    await expect(service.setEquipped(room.id, user.id, { outfit: { body: 'default', hat: 'hat' } }))
      .rejects.toThrow('wardrobe_locked')
    // 类别不符：把围巾塞进 hat 槽
    await expect(service.setEquipped(room.id, user.id, { outfit: { body: 'default', hat: 'scarf' } }))
      .rejects.toThrow('invalid_suit')
    // 合法穿戴：围巾（初始解锁）
    const saved = await service.setEquipped(room.id, user.id, { outfit: { body: 'default', scarf: 'scarf' } })
    expect(saved.outfit).toEqual({ body: 'default', hat: null, scarf: 'scarf', bag: null })
    const view = await service.get(room.id, user.id)
    expect(view.outfit).toEqual({ body: 'default', hat: null, scarf: 'scarf', bag: null })
    expect(view.equipped).toBe('default')
    // 兼容旧载荷：单 key = 只换主体
    await service.setEquipped(room.id, user.id, 'hoodie')
    const view2 = await service.get(room.id, user.id)
    expect(view2.outfit).toEqual({ body: 'hoodie', hat: null, scarf: null, bag: null })
  })

  it('settles once when both picked the same suit, with streak and event', async () => {
    const { repositories, user, friend, room } = await createPairRoom()
    const settled: MatchSettledEvent[] = []
    const service = createService(repositories, settled)
    await service.submitMatchPick(room.id, user.id, 'scarf')
    const mine = await service.submitMatchPick(room.id, friend.id, 'scarf')
    expect(mine).toMatchObject({ myPick: 'scarf', partnerPicked: true, matchedToday: true, streak: 1, bestStreak: 1 })
    expect(settled).toHaveLength(1)
    expect(settled[0]).toMatchObject({ roomId: room.id, matched: true, itemId: 'scarf', streak: 1 })

    // 再 GET/POST 不重复结算（先到先结算门闩）
    await service.get(room.id, user.id)
    expect(settled).toHaveLength(1)
    await expect(service.submitMatchPick(room.id, user.id, 'hoodie')).rejects.toThrow('outfit_match_already_picked')
  })

  it('mismatch resets streak but keeps the best', async () => {
    const { repositories, user, friend, room } = await createPairRoom()
    const settled: MatchSettledEvent[] = []
    const service = createService(repositories, settled)
    await service.submitMatchPick(room.id, user.id, 'scarf')
    await service.submitMatchPick(room.id, friend.id, 'scarf')
    // 次日：不一致 → streak 清零，bestStreak 保留
    const later = new Date(FIXED_NOW.getTime() + 24 * 3600 * 1000)
    const dayTwo = createWardrobeService(repositories, {
      now: () => later,
      onMatchSettled: (event) => settled.push(event)
    })
    await dayTwo.submitMatchPick(room.id, user.id, 'hoodie')
    const result = await dayTwo.submitMatchPick(room.id, friend.id, 'scarf')
    expect(result.matchedToday).toBe(false)
    expect(result.streak).toBe(0)
    expect(result.bestStreak).toBe(1)
    expect(settled).toHaveLength(2)
    expect(settled[1].matched).toBe(false)
  })

  it('cannot submit a locked suit for the daily match', async () => {
    const { repositories, user, room } = await createPairRoom()
    const service = createService(repositories)
    await expect(service.submitMatchPick(room.id, user.id, 'dress')).rejects.toThrow('wardrobe_locked')
    await expect(service.submitMatchPick(room.id, user.id, 'default')).resolves.toMatchObject({ myPick: 'default' })
  })

  it('gm unlock-all opens every suit and reverts when disabled', async () => {
    const { repositories, user, room } = await createPairRoom()
    const service = createService(repositories)
    await expect(service.setEquipped(room.id, user.id, 'overalls')).rejects.toThrow('wardrobe_locked')

    await repositories.wardrobe.setGmUnlockAll(room.id, true)
    const view = await service.get(room.id, user.id)
    expect(view.items.every((item) => item.unlocked)).toBe(true)
    // GM 全解锁下：锁定套装可直接穿戴，也可参与当日默契
    await expect(service.setEquipped(room.id, user.id, 'overalls')).resolves.toMatchObject({ equipped: 'overalls' })
    await expect(service.submitMatchPick(room.id, user.id, 'dress')).resolves.toMatchObject({ myPick: 'dress' })

    await repositories.wardrobe.setGmUnlockAll(room.id, false)
    const reverted = await service.get(room.id, user.id)
    expect(reverted.items.filter((item) => item.unlocked).map((item) => item.key)).toEqual(['default', 'scarf', 'hoodie'])
    await expect(service.setEquipped(room.id, user.id, 'dress')).rejects.toThrow('wardrobe_locked')
  })

  it('single pick does not settle', async () => {
    const { repositories, user, room } = await createPairRoom()
    const settled: MatchSettledEvent[] = []
    const service = createService(repositories, settled)
    await service.submitMatchPick(room.id, user.id, 'scarf')
    const view = await service.get(room.id, user.id)
    expect(view.match.myPick).toBe('scarf')
    expect(view.match.partnerPicked).toBe(false)
    expect(view.match.matchedToday).toBe(false)
    expect(settled).toHaveLength(0)
  })
})
