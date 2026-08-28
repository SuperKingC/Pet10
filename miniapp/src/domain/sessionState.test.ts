import { describe, expect, it } from 'vitest'
import { hasAuthenticatedSession, isAccountMissingError } from './sessionState'

describe('session state', () => {
  it('tracks whether a session token is available', () => {
    expect(hasAuthenticatedSession('session-token')).toBe(true)
    expect(hasAuthenticatedSession('')).toBe(false)
  })

  it('detects the account-missing launch error', () => {
    expect(isAccountMissingError(new Error('user_not_found'))).toBe(true)
    expect(isAccountMissingError(new Error('room_not_found'))).toBe(false)
    expect(isAccountMissingError(new Error('request_failed:500'))).toBe(false)
    expect(isAccountMissingError('user_not_found')).toBe(false)
    expect(isAccountMissingError(undefined)).toBe(false)
  })
})
