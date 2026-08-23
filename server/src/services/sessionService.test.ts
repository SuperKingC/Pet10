import { describe, expect, it } from 'vitest'
import { createMemoryRepositories } from '../repositories/memoryRepositories.js'
import { createFriendshipService } from './friendshipService.js'
import { createSessionService } from './sessionService.js'

describe('session service', () => {
  it('updates and returns the user gender', async () => {
    const repositories = createMemoryRepositories()
    const user = await repositories.users.create({
      email: 'profile@example.com',
      username: 'profile',
      displayName: 'Profile'
    })
    const service = createSessionService(repositories)

    const updated = await service.updateProfile(user.id, { gender: 'female' })

    expect(updated.gender).toBe('female')
    await expect(repositories.users.findById(user.id)).resolves.toMatchObject({
      gender: 'female'
    })
  })

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

  it('includes pet-less rooms in launch context and prefers a pet room as active', async () => {
    const repositories = createMemoryRepositories()
    const first = await repositories.users.create({ email: 'a@example.com', username: 'a', displayName: 'A' })
    const second = await repositories.users.create({ email: 'b@example.com', username: 'b', displayName: 'B' })
    const third = await repositories.users.create({ email: 'c@example.com', username: 'c', displayName: 'C' })
    // first 和 second 共养小多利
    const petRelationship = await repositories.relationships.create(first.id, second.id)
    await repositories.relationships.accept(petRelationship.id)
    const petRoom = await repositories.rooms.createForRelationship(petRelationship.id)
    await repositories.pets.createForRelationship(petRelationship.id, petRoom.id)
    // first 和 third 只是好友（third 共养名额已满，不创建小多利）
    const friendRelationship = await repositories.relationships.create(first.id, third.id)
    await repositories.relationships.accept(friendRelationship.id)
    const friendRoom = await repositories.rooms.createForRelationship(friendRelationship.id)

    const context = await createSessionService(repositories).getLaunchContext(first.id)

    expect(context.rooms).toHaveLength(2)
    expect(context.rooms.find((room) => room.id === friendRoom.id)?.pet).toBeNull()
    expect(context.rooms.find((room) => room.id === petRoom.id)?.pet?.name).toBe('小多利')
    expect(context.activeRoomId).toBe(petRoom.id)
  })

  it('prioritizes a valid invitation in launch context', async () => {
    const repositories = createMemoryRepositories()
    const inviter = await repositories.users.create({ email: 'a@example.com', username: 'a', displayName: 'A' })
    const invitee = await repositories.users.create({ email: 'b@example.com', username: 'b', displayName: 'B' })
    const invitation = await repositories.invitations.create({
      token: 'invite-token',
      inviterId: inviter.id,
      expiresAt: new Date(Date.now() + 60_000)
    })

    const context = await createSessionService(repositories, {
      getInvitation: async (token) => {
        if (token !== invitation.token) throw new Error('invitation_not_found')
        return {
          token: invitation.token,
          inviter: {
            id: inviter.id,
            displayName: inviter.displayName,
            avatarUrl: inviter.avatarUrl
          },
          expiresAt: invitation.expiresAt.toISOString()
        }
      }
    }).getLaunchContext(invitee.id, { invitationToken: invitation.token })

    expect(context.entry).toBe('invite')
    expect(context.pendingInvitations).toEqual([{
      token: invitation.token,
      inviter: {
        id: inviter.id,
        displayName: inviter.displayName,
        avatarUrl: inviter.avatarUrl
      },
      expiresAt: invitation.expiresAt.toISOString()
    }])
  })

  it('returns a waiting room entry without shared rooms', async () => {
    const repositories = createMemoryRepositories()
    const user = await repositories.users.create({ email: 'waiting@example.com', username: 'waiting', displayName: 'Waiting' })

    const context = await createSessionService(repositories).getLaunchContext(user.id)

    expect(context.entry).toBe('waiting-room')
    expect(context.rooms).toEqual([])
  })
})
