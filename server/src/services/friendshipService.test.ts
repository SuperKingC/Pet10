import { describe, expect, it } from 'vitest'
import { createFriendshipService } from './friendshipService.js'
import { createMemoryRepositories } from '../repositories/memoryRepositories.js'

describe('friendship service', () => {
  it('creates a chat room but no pet when a request is accepted (pet needs co-raise confirm)', async () => {
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
    expect(pet).toBeUndefined()
  })

  it('allows a user to bind multiple friends', async () => {
    const repositories = createMemoryRepositories()
    const first = await repositories.users.create({ email: 'a@example.com', username: 'a', displayName: 'A' })
    await repositories.users.create({ email: 'b@example.com', username: 'b', displayName: 'B' })
    await repositories.users.create({ email: 'c@example.com', username: 'c', displayName: 'C' })
    const service = createFriendshipService(repositories)

    const firstRequest = await service.sendRequest(first.id, 'b')
    const secondRequest = await service.sendRequest(first.id, 'c')

    expect(firstRequest.status).toBe('pending')
    expect(secondRequest.status).toBe('pending')
  })

  it('rejects duplicate relationship between the same pair', async () => {
    const repositories = createMemoryRepositories()
    const first = await repositories.users.create({ email: 'a@example.com', username: 'a', displayName: 'A' })
    await repositories.users.create({ email: 'b@example.com', username: 'b', displayName: 'B' })
    const service = createFriendshipService(repositories)

    await service.sendRequest(first.id, 'b')
    await expect(service.sendRequest(first.id, 'b')).rejects.toThrow('relationship_already_exists')
  })

  it('finds a friend by email address', async () => {
    const repositories = createMemoryRepositories()
    const first = await repositories.users.create({ email: 'first@example.com', username: 'first_1234', displayName: 'First' })
    const second = await repositories.users.create({ email: 'second@example.com', username: 'second_5678', displayName: 'Second' })
    const service = createFriendshipService(repositories)

    const relationship = await service.sendRequest(first.id, 'SECOND@example.com')

    expect(relationship.addresseeId).toBe(second.id)
  })

  it('matches usernames without case sensitivity', async () => {
    const repositories = createMemoryRepositories()
    const first = await repositories.users.create({ email: 'first@example.com', username: 'first_1234', displayName: 'First' })
    const second = await repositories.users.create({ email: 'second@example.com', username: 'second_5678', displayName: 'Second' })
    const service = createFriendshipService(repositories)

    const relationship = await service.sendRequest(first.id, 'SECOND_5678')

    expect(relationship.addresseeId).toBe(second.id)
  })

  it('looks up a user by uid with relation state and never sends a request', async () => {
    const repositories = createMemoryRepositories()
    const first = await repositories.users.create({ email: 'first@example.com', username: 'first', displayName: 'First' })
    const second = await repositories.users.create({ email: 'second@example.com', username: 'second', displayName: 'Second' })
    const service = createFriendshipService(repositories)

    const stranger = await service.lookupUser(first.id, second.uid.replace(/^0+/, ''))
    expect(stranger).toMatchObject({ id: second.id, relation: 'none' })

    await service.sendRequest(first.id, second.uid.replace(/^0+/, ''))
    const sent = await service.lookupUser(first.id, second.uid)
    expect(sent.relation).toBe('request_sent')

    const received = await service.lookupUser(second.id, first.uid)
    expect(received.relation).toBe('request_received')

    await service.acceptRequest(second.id, (await repositories.relationships.listPendingForUser(second.id))[0].id)
    const friends = await service.lookupUser(first.id, second.uid)
    expect(friends.relation).toBe('friends')

    const self = await service.lookupUser(first.id, first.uid)
    expect(self.relation).toBe('self')

    await expect(service.lookupUser(first.id, '99999999')).rejects.toThrow('user_not_found')
    expect(await repositories.relationships.listPendingForUser(first.id)).toHaveLength(0)
  })

  it('suggests recent users without friendship or pending requests, excluding self', async () => {
    const repositories = createMemoryRepositories()
    const me = await repositories.users.create({ email: 'me@example.com', username: 'me', displayName: 'Me' })
    const service = createFriendshipService(repositories)

    const others = []
    for (const name of ['older', 'newer1', 'newer2', 'newer3']) {
      others.push(await repositories.users.create({ email: `${name}@example.com`, username: name, displayName: name }))
    }
    // 与 newer1 已是好友、与 newer2 有待处理申请：两者都不应出现在推荐里
    await service.sendRequest(me.id, 'newer1')
    const pending = await repositories.relationships.listPendingForUser(me.id)
    await service.acceptRequest(others[1].id, pending[0].id)
    await service.sendRequest(me.id, 'newer2')

    const suggestions = await service.listSuggestions(me.id)

    expect(suggestions.map((item) => item.displayName)).toEqual(['newer3', 'older'])
    expect(suggestions[0]).toMatchObject({ uid: others[3].uid })
  })
})
