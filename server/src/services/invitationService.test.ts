import { describe, expect, it } from 'vitest'
import { createMemoryRepositories } from '../repositories/memoryRepositories.js'
import { createInvitationService } from './invitationService.js'

describe('invitation service', () => {
  it('creates and accepts an invitation for a new pair room', async () => {
    const repositories = createMemoryRepositories()
    const inviter = await repositories.users.create({ email: 'a@example.com', username: 'a', displayName: 'A' })
    const invitee = await repositories.users.create({ email: 'b@example.com', username: 'b', displayName: 'B' })
    const service = createInvitationService(repositories, { ttlSeconds: 3600 })

    const invitation = await service.create(inviter.id)
    const summary = await service.get(invitation.token)
    const accepted = await service.accept(invitation.token, invitee.id)

    expect(summary.inviter.id).toBe(inviter.id)
    expect(accepted.relationship.requesterId).toBe(inviter.id)
    expect(accepted.relationship.addresseeId).toBe(invitee.id)
    expect(await repositories.rooms.findByRelationshipId(accepted.relationship.id)).toBeDefined()
  })

  it('rejects self acceptance and expired invitations', async () => {
    const repositories = createMemoryRepositories()
    const inviter = await repositories.users.create({ email: 'a@example.com', username: 'a', displayName: 'A' })
    const service = createInvitationService(repositories, { ttlSeconds: -1 })
    const invitation = await service.create(inviter.id)

    await expect(service.accept(invitation.token, inviter.id)).rejects.toThrow('cannot_invite_self')
    await expect(service.get(invitation.token)).rejects.toThrow('invitation_expired')
  })

  it('rejects a second invitation for an existing pair', async () => {
    const repositories = createMemoryRepositories()
    const inviter = await repositories.users.create({ email: 'a@example.com', username: 'a', displayName: 'A' })
    const invitee = await repositories.users.create({ email: 'b@example.com', username: 'b', displayName: 'B' })
    const service = createInvitationService(repositories)

    const invitation = await service.create(inviter.id)
    await service.accept(invitation.token, invitee.id)

    const second = await service.create(inviter.id)
    await expect(service.accept(second.token, invitee.id)).rejects.toThrow('relationship_already_exists')
  })

  it('allows only one concurrent acceptance for the same invitation', async () => {
    const repositories = createMemoryRepositories()
    const inviter = await repositories.users.create({ email: 'a@example.com', username: 'a', displayName: 'A' })
    const invitee = await repositories.users.create({ email: 'b@example.com', username: 'b', displayName: 'B' })
    const service = createInvitationService(repositories)
    const invitation = await service.create(inviter.id)

    const results = await Promise.allSettled([
      service.accept(invitation.token, invitee.id),
      service.accept(invitation.token, invitee.id)
    ])

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((result) => result.status === 'rejected')[0]).toMatchObject({
      reason: expect.objectContaining({ message: 'invitation_unavailable' })
    })
    expect((await repositories.relationships.listAcceptedForUser(inviter.id))).toHaveLength(1)
  })

  it('keeps friendship but skips the pet when the accepter already co-owns a pet', async () => {
    const repositories = createMemoryRepositories()
    const inviter = await repositories.users.create({ email: 'a@example.com', username: 'a', displayName: 'A' })
    const busy = await repositories.users.create({ email: 'b@example.com', username: 'b', displayName: 'B' })
    const other = await repositories.users.create({ email: 'c@example.com', username: 'c', displayName: 'C' })
    const service = createInvitationService(repositories, { ttlSeconds: 3600 })

    // busy 先和 other 共养了小多利
    const first = await service.create(busy.id)
    await service.accept(first.token, other.id)

    // inviter 再邀请 busy：仍是好友、有房间，但没有新的小多利
    const second = await service.create(inviter.id)
    const accepted = await service.accept(second.token, busy.id)

    expect(accepted.relationship.requesterId).toBe(inviter.id)
    expect(await repositories.rooms.findByRelationshipId(accepted.relationship.id)).toBeDefined()
    expect(accepted.pet).toBeNull()
    expect(await repositories.pets.findByRoomId(accepted.room.id)).toBeUndefined()
    expect(await repositories.memories.listByRoom(accepted.room.id)).toHaveLength(0)
  })

  it('keeps friendship but skips the pet when the inviter already co-owns a pet', async () => {
    const repositories = createMemoryRepositories()
    const inviter = await repositories.users.create({ email: 'a@example.com', username: 'a', displayName: 'A' })
    const partner = await repositories.users.create({ email: 'b@example.com', username: 'b', displayName: 'B' })
    const newcomer = await repositories.users.create({ email: 'c@example.com', username: 'c', displayName: 'C' })
    const service = createInvitationService(repositories, { ttlSeconds: 3600 })

    const first = await service.create(inviter.id)
    await service.accept(first.token, partner.id)

    const second = await service.create(inviter.id)
    const accepted = await service.accept(second.token, newcomer.id)

    expect(accepted.pet).toBeNull()
    expect(await repositories.pets.findByRoomId(accepted.room.id)).toBeUndefined()
  })

  it('writes a first-meeting memory when the invitation is accepted', async () => {
    const repositories = createMemoryRepositories()
    const inviter = await repositories.users.create({ email: 'a@example.com', username: 'a', displayName: '小A' })
    const invitee = await repositories.users.create({ email: 'b@example.com', username: 'b', displayName: '小B' })
    const service = createInvitationService(repositories, { ttlSeconds: 3600 })
    const invitation = await service.create(inviter.id)

    const accepted = await service.accept(invitation.token, invitee.id)
    const memories = await repositories.memories.listByRoom(accepted.room.id)

    expect(memories).toHaveLength(1)
    expect(memories[0].text).toBe('小多利见证了 小B 和 小A 的初次见面，从今天起一起住在这个小窝里。')
    expect(memories[0].category).toBe('relationship')
    expect(memories[0].source).toBe('explicit')
    expect(memories[0].importance).toBe(3)
  })
})
