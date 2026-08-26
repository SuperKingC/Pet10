import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { resolveErrorResponse } from './errorResponse.js'

describe('resolveErrorResponse', () => {
  it('returns client errors for invitation conflicts', () => {
    expect(resolveErrorResponse(new Error('cannot_invite_self'))).toEqual({
      status: 400,
      error: 'cannot_invite_self',
    })
    expect(resolveErrorResponse(new Error('invitation_expired'))).toEqual({
      status: 400,
      error: 'invitation_expired',
    })
    expect(resolveErrorResponse(new Error('invitation_unavailable'))).toEqual({
      status: 400,
      error: 'invitation_unavailable',
    })
  })

  it('returns 503 when an integration is not configured', () => {
    expect(resolveErrorResponse(new Error('wechat_login_not_configured'))).toEqual({
      status: 503,
      error: 'wechat_login_not_configured',
    })
  })

  it('returns 400 for zod validation failures', () => {
    const error = z.object({ name: z.string() }).safeParse({ name: 1 }).error
    expect(resolveErrorResponse(error)).toEqual({ status: 400, error: 'invalid_input' })
  })
})
