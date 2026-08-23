import { describe, expect, it } from 'vitest'
import { invitationViewerMessage, resolveInvitationViewer } from './invitationViewer'

describe('resolveInvitationViewer', () => {
  it('marks an invitation opened by its inviter as self-owned', () => {
    expect(resolveInvitationViewer('user-1', 'user-1')).toBe('owner')
    expect(resolveInvitationViewer('user-1', 'user-2')).toBe('invitee')
  })
})

  it('uses the welcome copy for the invited friend', () => {
    expect(invitationViewerMessage('invitee')).toBe('带我回家吧——从此这个窝，是你们俩的。')
    expect(invitationViewerMessage('owner')).toBe('这是你发出的邀请')
  })
