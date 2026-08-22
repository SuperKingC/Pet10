import { describe, expect, it } from 'vitest'
import { createMemoryRepositories } from '../repositories/memoryRepositories.js'
import { createFriendshipService } from './friendshipService.js'
import { createGmService } from './gmService.js'

function setup() {
  const repositories = createMemoryRepositories()
  const friendship = createFriendshipService(repositories)
  const gm = createGmService(repositories, friendship)
  return { repositories, gm }
}

describe('gm service', () => {
  it('adds accepted friendships with room and pet for each friend', async () => {
    const { repositories, gm } = setup()
    const me = await repositories.users.create({ email: 'me@example.com', username: 'me', displayName: '我' })

    const result = await gm.addFriends(me.id, 3)

    expect(result.added).toHaveLength(3)
    const relationships = await repositories.relationships.listAcceptedForUser(me.id)
    expect(relationships).toHaveLength(3)
    for (const relationship of relationships) {
      const room = await repositories.rooms.findByRelationshipId(relationship.id)
      expect(room).toBeDefined()
      expect(await repositories.pets.findByRoomId(room!.id)).toBeDefined()
    }
  })

  it('adds a single friend for the one-friend scenario', async () => {
    const { repositories, gm } = setup()
    const me = await repositories.users.create({ email: 'me@example.com', username: 'me', displayName: '我' })

    const result = await gm.addFriends(me.id, 1)

    expect(result.added).toHaveLength(1)
    expect(await repositories.relationships.listAcceptedForUser(me.id)).toHaveLength(1)
  })

  it('rejects count out of range', async () => {
    const { repositories, gm } = setup()
    const me = await repositories.users.create({ email: 'me@example.com', username: 'me', displayName: '我' })

    await expect(gm.addFriends(me.id, 0)).rejects.toThrow('invalid_count')
    await expect(gm.addFriends(me.id, 11)).rejects.toThrow('invalid_count')
    await expect(gm.addFriends(me.id, 1.5)).rejects.toThrow('invalid_count')
  })
})
