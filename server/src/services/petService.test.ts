import { describe, expect, it, vi } from 'vitest'
import { createPetService } from './petService.js'
import { createFriendshipService } from './friendshipService.js'
import { createMemoryRepositories } from '../repositories/memoryRepositories.js'

describe('pet service', () => {
  it('changes pet state through server-side rules', async () => {
    const repositories = createMemoryRepositories()
    const user = await repositories.users.create({ email: 'a@example.com', username: 'a', displayName: 'A' })
    const friend = await repositories.users.create({ email: 'b@example.com', username: 'b', displayName: 'B' })
    const friendshipService = createFriendshipService(repositories)
    const relationship = await friendshipService.sendRequest(user.id, friend.username)
    await friendshipService.acceptRequest(friend.id, relationship.id)
    const room = await repositories.rooms.findByRelationshipId(relationship.id)
    if (!room) throw new Error('room missing')
    const service = createPetService(repositories)
    const before = await service.getForRoom(room.id, user.id)
    const after = await service.applyAction(room.id, user.id, 'play')

    expect(after.mood).toBeGreaterThan(before.mood)
    expect(after.energy).toBeLessThan(before.energy)
  })

  it('applies only the standard intimacy change without a fortune bonus', async () => {
    const repositories = createMemoryRepositories()
    const user = await repositories.users.create({ email: 'c@example.com', username: 'c', displayName: 'C' })
    const friend = await repositories.users.create({ email: 'd@example.com', username: 'd', displayName: 'D' })
    const friendshipService = createFriendshipService(repositories)
    const relationship = await friendshipService.sendRequest(user.id, friend.username)
    await friendshipService.acceptRequest(friend.id, relationship.id)
    const room = await repositories.rooms.findByRelationshipId(relationship.id)
    if (!room) throw new Error('room missing')
    const onPetEvent = vi.fn()
    const service = createPetService(repositories, { onPetEvent })
    const before = await service.getForRoom(room.id, user.id)

    const after = await service.applyAction(room.id, user.id, 'play')

    expect(after.intimacy).toBe(before.intimacy + 3)
    expect(onPetEvent).toHaveBeenCalledWith(room.id, user.id, 'play', {
      pet: after,
      leveledUp: false
    })
  })
})
