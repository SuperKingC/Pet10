import { describe, expect, it } from 'vitest'
import { createFriendshipService } from './friendshipService.js'
import { createMemoryRepositories } from '../repositories/memoryRepositories.js'

describe('friendship service', () => {
  it('creates a shared room and 小多利 when a request is accepted', async () => {
    const repositories = createMemoryRepositories()
    const first = await repositories.users.create({
      email: 'first@example.com',
      username: 'first',
      displayName: 'First'
    })
    const second = await repositories.users.create({
      email: 'second@example.com',
      username: 'second',
      displayName: 'Second'
    })
    const service = createFriendshipService(repositories)

    const relationship = await service.sendRequest(first.id, 'second')
    const accepted = await service.acceptRequest(second.id, relationship.id)
    const room = await repositories.rooms.findByRelationshipId(accepted.id)
    const pet = room ? await repositories.pets.findByRoomId(room.id) : undefined

    expect(accepted.status).toBe('accepted')
    expect(room).toBeDefined()
    expect(pet?.name).toBe('小多利')
  })

  it('prevents a user from binding a second friend in the first version', async () => {
    const repositories = createMemoryRepositories()
    const first = await repositories.users.create({ email: 'a@example.com', username: 'a', displayName: 'A' })
    await repositories.users.create({ email: 'b@example.com', username: 'b', displayName: 'B' })
    await repositories.users.create({ email: 'c@example.com', username: 'c', displayName: 'C' })
    const service = createFriendshipService(repositories)

    await service.sendRequest(first.id, 'b')
    await expect(service.sendRequest(first.id, 'c')).rejects.toThrow('friend_limit_reached')
  })
})
