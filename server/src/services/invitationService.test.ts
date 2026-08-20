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
})
