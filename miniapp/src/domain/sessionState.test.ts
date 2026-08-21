import { describe, expect, it } from 'vitest'
import { hasAuthenticatedSession } from './sessionState'

describe('session state', () => {
  it('tracks whether a session token is available', () => {
    expect(hasAuthenticatedSession('session-token')).toBe(true)
    expect(hasAuthenticatedSession('')).toBe(false)
  })
})
