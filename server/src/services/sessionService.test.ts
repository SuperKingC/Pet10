import { describe, expect, it } from 'vitest'
import { createMemoryRepositories } from '../repositories/memoryRepositories.js'
import { createFriendshipService } from './friendshipService.js'
import { createSessionService } from './sessionService.js'

describe('session service', () => {
  it('returns an unbound state for a user without relationships', async () => {
    const repositories = createMemoryRepositories()
    const user = await repositories.users.create({ email: 'a@example.com', username: 'a', displayName: 'A' })
    const service = createSessionService(repositories)

    const result = await service.getHome(user.id)
    expect(result.status).toBe('unbound')
    expect(result.user.username).toBe('a')
  })

  it('distinguishes incoming and outgoing pending relationships', async () => {
    const repositories = createMemoryRepositories()
    const first = await repositories.users.create({ email: 'a@example.com', username: 'a', displayName: 'A' })
    const second = await repositories.users.create({ email: 'b@example.com', username: 'b', displayName: 'B' })
    const friendship = createFriendshipService(repositories)
    await friendship.sendRequest(first.id, second.username)
    const service = createSessionService(repositories)

    expect((await service.getHome(first.id)).status).toBe('pending_outgoing')
    expect((await service.getHome(second.id)).status).toBe('pending_incoming')
  })

  it('returns room bootstrap data after friendship acceptance', async () => {
    const repositories = createMemoryRepositories()
    const first = await repositories.users.create({ email: 'a@example.com', username: 'a', displayName: 'A' })
    const second = await repositories.users.create({ email: 'b@example.com', username: 'b', displayName: 'B' })
    const friendship = createFriendshipService(repositories)
    const relationship = await friendship.sendRequest(first.id, second.username)
    await friendship.acceptRequest(second.id, relationship.id)
    const service = createSessionService(repositories)

    const result = await service.getHome(first.id)
    expect(result.status).toBe('accepted')
    if (result.status !== 'accepted') throw new Error('unexpected status')
    expect(result.friend.id).toBe(second.id)
    expect(result.room.relationshipId).toBe(relationship.id)
    expect(result.pet.name).toBe('小多利')
  })

  it('returns every shared room for the user in launch context', async () => {
    const repositories = createMemoryRepositories()
    const first = await repositories.users.create({ email: 'a@example.com', username: 'a', displayName: 'A' })
    const second = await repositories.users.create({ email: 'b@example.com', username: 'b', displayName: 'B' })
    const third = await repositories.users.create({ email: 'c@example.com', username: 'c', displayName: 'C' })
    const friendship = createFriendshipService(repositories)
    const firstRelationship = await friendship.sendRequest(first.id, second.username)
    await friendship.acceptRequest(second.id, firstRelationship.id)
    const secondRelationship = await friendship.sendRequest(first.id, third.username)
    await friendship.acceptRequest(third.id, secondRelationship.id)

    const context = await createSessionService(repositories).getLaunchContext(first.id)

    expect(context.entry).toBe('shared-room')
    expect(context.rooms).toHaveLength(2)
    expect(context.rooms.map((room) => room.partner.displayName)).toEqual(expect.arrayContaining(['B', 'C']))
  })

  it('returns a waiting room entry without shared rooms', async () => {
    const repositories = createMemoryRepositories()
    const user = await repositories.users.create({ email: 'waiting@example.com', username: 'waiting', displayName: 'Waiting' })

    const context = await createSessionService(repositories).getLaunchContext(user.id)

    expect(context.entry).toBe('waiting-room')
    expect(context.rooms).toEqual([])
  })
})
