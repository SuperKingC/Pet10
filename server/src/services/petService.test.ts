import { describe, expect, it, vi } from 'vitest'
import { createPetService } from './petService.js'
import { createFriendshipService } from './friendshipService.js'
import { createCoRaiseService } from './coRaiseService.js'
import { createMemoryRepositories } from '../repositories/memoryRepositories.js'

async function seedPetRoom(repositories: ReturnType<typeof createMemoryRepositories>, emails: [string, string]) {
  const user = await repositories.users.create({ email: emails[0], username: emails[0].split('@')[0], displayName: 'A' })
  const friend = await repositories.users.create({ email: emails[1], username: emails[1].split('@')[0], displayName: 'B' })
  const friendshipService = createFriendshipService(repositories)
  const relationship = await friendshipService.sendRequest(user.id, friend.username)
  await friendshipService.acceptRequest(friend.id, relationship.id)
  const coRaise = createCoRaiseService(repositories)
  await coRaise.invite(user.id, relationship.id)
  await coRaise.confirm(friend.id, relationship.id)
  const room = await repositories.rooms.findByRelationshipId(relationship.id)
  if (!room) throw new Error('room missing')
  return { user, room }
}

describe('pet service', () => {
  it('changes pet state through server-side rules', async () => {
    const repositories = createMemoryRepositories()
    const { user, room } = await seedPetRoom(repositories, ['a@example.com', 'b@example.com'])
    const service = createPetService(repositories)
    const before = await service.getForRoom(room.id, user.id)
    const after = await service.applyAction(room.id, user.id, 'play')

    expect(after.mood).toBeGreaterThan(before.mood)
    expect(after.energy).toBeLessThan(before.energy)
  })

  it('applies only the standard intimacy change without a fortune bonus', async () => {
    const repositories = createMemoryRepositories()
    const { user, room } = await seedPetRoom(repositories, ['c@example.com', 'd@example.com'])
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
