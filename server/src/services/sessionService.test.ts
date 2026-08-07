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
})
