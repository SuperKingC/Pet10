import { describe, expect, it } from 'vitest'
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
})
