import { describe, expect, it } from 'vitest'
import { resolveInvitationViewer } from './invitationViewer'

describe('resolveInvitationViewer', () => {
  it('marks an invitation opened by its inviter as self-owned', () => {
    expect(resolveInvitationViewer('user-1', 'user-1')).toBe('owner')
    expect(resolveInvitationViewer('user-1', 'user-2')).toBe('invitee')
  })
})
