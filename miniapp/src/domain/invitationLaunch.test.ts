import { describe, expect, it } from 'vitest'
import { resolveInvitationLaunchToken } from './invitationLaunch'

describe('invitation launch token', () => {
  it('only uses the token from the current launch options', () => {
    expect(resolveInvitationLaunchToken({ token: 'current-token' })).toBe('current-token')
    expect(resolveInvitationLaunchToken({})).toBe('')
    expect(resolveInvitationLaunchToken({ token: 123 })).toBe('')
    expect(resolveInvitationLaunchToken()).toBe('')
  })
})
