import { describe, expect, it } from 'vitest'
import { createMemoryRepositories } from '../repositories/memoryRepositories.js'
import { createFriendshipService } from './friendshipService.js'
import { createGmService } from './gmService.js'

function setup() {
  const repositories = createMemoryRepositories()
  const friendship = createFriendshipService(repositories)
  const gm = createGmService(repositories, friendship)
  return { repositories, friendship, gm }
}

describe('gm service', () => {
  it('adds accepted friendships with rooms for each friend (no pets without co-raise confirm)', async () => {
    const { repositories, gm } = setup()
    const me = await repositories.users.create({ email: 'me@example.com', username: 'me', displayName: '我' })

    const result = await gm.addFriends(me.id, 3)

    expect(result.added).toHaveLength(3)
    const relationships = await repositories.relationships.listAcceptedForUser(me.id)
    expect(relationships).toHaveLength(3)
    for (const relationship of relationships) {
      const room = await repositories.rooms.findByRelationshipId(relationship.id)
      expect(room).toBeDefined()
      expect(await repositories.pets.findByRoomId(room!.id)).toBeUndefined()
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

  it('removes only gm-created friends and keeps real friendships', async () => {
    const { repositories, friendship, gm } = setup()
    const me = await repositories.users.create({ email: 'me@example.com', username: 'me', displayName: '我' })

    await gm.addFriends(me.id, 2)
    const realFriend = await repositories.users.create({ email: 'real@example.com', username: 'real', displayName: '真好友' })
    const realRelationship = await friendship.sendRequest(me.id, 'real')
    await friendship.acceptRequest(realFriend.id, realRelationship.id)

    const result = await gm.removeFriends(me.id)

    expect(result.removed).toHaveLength(2)
    for (const removedFriend of result.removed) {
      expect(await repositories.users.findById(removedFriend.userId)).toBeUndefined()
    }
    const remaining = await repositories.relationships.listAcceptedForUser(me.id)
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe(realRelationship.id)
  })

  it('removes nothing when there are no gm-created friends', async () => {
    const { repositories, gm } = setup()
    const me = await repositories.users.create({ email: 'me@example.com', username: 'me', displayName: '我' })

    const result = await gm.removeFriends(me.id)

    expect(result.removed).toHaveLength(0)
    expect(await repositories.relationships.listAcceptedForUser(me.id)).toHaveLength(0)
  })

  it('adds care items to every room of the user', async () => {
    const { repositories, gm } = setup()
    const me = await repositories.users.create({ email: 'me@example.com', username: 'me', displayName: '我' })
    const room = await repositories.rooms.createPetDm(me.id)

    const result = await gm.addNestItems(me.id)

    expect(result).toEqual({ rooms: 1, grantedPerItem: 9 })
    const counts = Object.fromEntries(
      (await repositories.inventory.listByRoom(room.id)).map((item) => [item.itemId, item.count])
    )
    expect(counts).toEqual({ dog_food: 9, ball: 9, soap: 9 })
  })

  it('toggles the wardrobe gm unlock-all flag on and off', async () => {
    const { repositories, gm } = setup()
    const me = await repositories.users.create({ email: 'me@example.com', username: 'me', displayName: '我' })
    const room = await repositories.rooms.createPetDm(me.id)

    await expect(gm.setWardrobeUnlockAll(me.id, true)).resolves.toEqual({ rooms: 1, gmUnlockAll: true })
    expect((await repositories.wardrobe.getState(room.id)).gmUnlockAll).toBe(true)

    await expect(gm.setWardrobeUnlockAll(me.id, false)).resolves.toEqual({ rooms: 1, gmUnlockAll: false })
    expect((await repositories.wardrobe.getState(room.id)).gmUnlockAll).toBe(false)
  })
})
