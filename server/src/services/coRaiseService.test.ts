import { describe, expect, it } from 'vitest'
import { createCoRaiseService } from './coRaiseService.js'
import { createFriendshipService } from './friendshipService.js'
import { createMemoryRepositories } from '../repositories/memoryRepositories.js'

async function seedUsers(repositories: ReturnType<typeof createMemoryRepositories>, count: number) {
  const users = []
  for (let index = 0; index < count; index += 1) {
    users.push(await repositories.users.create({
      email: `user${index}@example.com`,
      username: `user${index}`,
      displayName: `用户${index}`
    }))
  }
  return users
}

async function makeFriends(repositories: ReturnType<typeof createMemoryRepositories>, fromId: string, toId: string) {
  const to = await repositories.users.findById(toId)
  const friendship = createFriendshipService(repositories)
  const relationship = await friendship.sendRequest(fromId, to!.username)
  await friendship.acceptRequest(toId, relationship.id)
  return relationship
}

describe('co-raise service', () => {
  it('creates the only 小多利 after confirm and refuses a second co-raise', async () => {
    const repositories = createMemoryRepositories()
    const [first, second, third] = await seedUsers(repositories, 3)
    const firstSecond = await makeFriends(repositories, first.id, second.id)
    const firstThird = await makeFriends(repositories, first.id, third.id)
    const service = createCoRaiseService(repositories)

    // 邀请后确认：房间内出现唯一的小多利
    await service.invite(first.id, firstSecond.id)
    const confirmed = await service.confirm(second.id, firstSecond.id)
    expect(confirmed.pet.name).toBe('小多利')
    expect((await repositories.pets.findByRoomId(confirmed.room.id))?.id).toBe(confirmed.pet.id)

    // 任一方已有小多利：对其他好友的邀请/确认都被拒绝
    await expect(service.invite(first.id, firstThird.id)).rejects.toThrow('pet_quota_used')
    await expect(service.confirm(third.id, firstThird.id)).rejects.toThrow('friend_pet_quota_used')
  })

  it('refuses confirm twice on the same room', async () => {
    const repositories = createMemoryRepositories()
    const [first, second] = await seedUsers(repositories, 2)
    const relationship = await makeFriends(repositories, first.id, second.id)
    const service = createCoRaiseService(repositories)

    await service.invite(first.id, relationship.id)
    await service.confirm(second.id, relationship.id)
    await expect(service.confirm(first.id, relationship.id)).rejects.toThrow('already_co_raising')
  })

  it('notifies the friend with co_raise_invitation and the inviter on accept', async () => {
    const repositories = createMemoryRepositories()
    const [first, second] = await seedUsers(repositories, 2)
    const relationship = await makeFriends(repositories, first.id, second.id)
    const events: Array<{ userId: string; type: string }> = []
    const service = createCoRaiseService(repositories, {
      notify: (userId, type) => events.push({ userId, type })
    })

    await service.invite(first.id, relationship.id)
    await service.confirm(second.id, relationship.id)

    expect(events).toEqual([
      { userId: second.id, type: 'co_raise_invitation' },
      { userId: first.id, type: 'co_raise_accepted' }
    ])
  })

  it('lists candidates with coRaising flags', async () => {
    const repositories = createMemoryRepositories()
    const [first, second, third] = await seedUsers(repositories, 3)
    const firstSecond = await makeFriends(repositories, first.id, second.id)
    await makeFriends(repositories, first.id, third.id)
    const service = createCoRaiseService(repositories)

    await service.invite(first.id, firstSecond.id)
    await service.confirm(second.id, firstSecond.id)

    const candidates = await service.listCandidates(first.id)
    const byFriend = new Map(candidates.map((candidate) => [candidate.friend.id, candidate]))
    expect(byFriend.get(second.id)?.coRaising).toBe(true)
    expect(byFriend.get(third.id)?.coRaising).toBe(false)
  })
})

describe('uid based friend requests', () => {
  it('assigns sequential eight digit uids and finds users by uid', async () => {
    const repositories = createMemoryRepositories()
    const [first, second] = await seedUsers(repositories, 2)

    expect(first.uid).toBe('00000001')
    expect(second.uid).toBe('00000002')
    expect((await repositories.users.findByUid('2'))?.id).toBe(second.id)
    expect((await repositories.users.findByUid('00000002'))?.id).toBe(second.id)
    expect(await repositories.users.findByUid('00000003')).toBeUndefined()
  })

  it('adds a friend by uid without creating a shared pet', async () => {
    const repositories = createMemoryRepositories()
    const [first, second] = await seedUsers(repositories, 2)
    const friendship = createFriendshipService(repositories)

    const relationship = await friendship.sendRequest(first.id, second.uid)
    const accepted = await friendship.acceptRequest(second.id, relationship.id)
    const room = await repositories.rooms.findByRelationshipId(accepted.id)

    expect(accepted.status).toBe('accepted')
    expect(room).toBeDefined()
    expect(await repositories.pets.findByRoomId(room!.id)).toBeUndefined()
  })

  it('includes the requester uid in the friend_request notification', async () => {
    const repositories = createMemoryRepositories()
    const [first, second] = await seedUsers(repositories, 2)
    const payloads: Record<string, unknown>[] = []
    const friendship = createFriendshipService(repositories, {
      notify: (_userId, _type, payload) => payloads.push(payload)
    })

    await friendship.sendRequest(first.id, second.uid)

    expect(payloads[0]).toMatchObject({ fromUid: first.uid, fromName: first.displayName })
  })
})
