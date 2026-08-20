import { randomBytes } from 'node:crypto'
import type { InvitationSummary } from '../domain/launchContext.js'
import type { RepositoryBundle } from '../repositories/contracts.js'

interface InvitationServiceOptions {
  ttlSeconds?: number
}

export function createInvitationService(
  repositories: RepositoryBundle,
  options: InvitationServiceOptions = {}
) {
  const ttlSeconds = options.ttlSeconds ?? 7 * 24 * 60 * 60

  return {
    async create(inviterId: string) {
      const inviter = await repositories.users.findById(inviterId)
      if (!inviter) throw new Error('user_not_found')
      return repositories.invitations.create({
        token: randomBytes(24).toString('base64url'),
        inviterId,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000)
      })
    },
    async get(token: string): Promise<InvitationSummary> {
      const invitation = await repositories.invitations.findByToken(token)
      if (!invitation) throw new Error('invitation_not_found')
      if (invitation.status !== 'pending') throw new Error('invitation_unavailable')
      if (invitation.expiresAt.getTime() <= Date.now()) throw new Error('invitation_expired')
      const inviter = await repositories.users.findById(invitation.inviterId)
      if (!inviter) throw new Error('user_not_found')
      return {
        token: invitation.token,
        inviter: {
          id: inviter.id,
          displayName: inviter.displayName,
          avatarUrl: inviter.avatarUrl
        },
        expiresAt: invitation.expiresAt.toISOString()
      }
    },
    async accept(token: string, accepterId: string) {
      const invitation = await repositories.invitations.findByToken(token)
      if (!invitation) throw new Error('invitation_not_found')
      if (invitation.inviterId === accepterId) throw new Error('cannot_invite_self')
      if (invitation.status !== 'pending') throw new Error('invitation_unavailable')
      if (invitation.expiresAt.getTime() <= Date.now()) throw new Error('invitation_expired')
      if (await repositories.relationships.findBetweenUsers(invitation.inviterId, accepterId)) {
        throw new Error('relationship_already_exists')
      }
      const relationship = await repositories.relationships.create(invitation.inviterId, accepterId)
      const room = await repositories.rooms.createForRelationship(relationship.id)
      const pet = await repositories.pets.createForRelationship(relationship.id, room.id)
      await repositories.invitations.accept(token, accepterId)
      return { invitation, relationship, room, pet }
    },
    async decline(token: string, userId: string) {
      const invitation = await repositories.invitations.findByToken(token)
      if (!invitation) throw new Error('invitation_not_found')
      if (invitation.inviterId === userId) throw new Error('invitation_not_found')
      if (invitation.status !== 'pending') throw new Error('invitation_unavailable')
      return repositories.invitations.decline(token, userId)
    }
  }
}
