import jwt from 'jsonwebtoken'
import { describe, expect, it, vi } from 'vitest'
import { createAuthMiddleware } from './authMiddleware.js'

function createResponse() {
  const response = {
    status: vi.fn(),
    json: vi.fn()
  }
  response.status.mockReturnValue(response)
  return response
}

describe('auth middleware allowlist', () => {
  it('rejects a valid token for an email outside the allowlist', () => {
    const token = jwt.sign({ sub: 'user-1', email: 'third@example.com' }, 'secret')
    const request = { headers: { authorization: `Bearer ${token}` } }
    const response = createResponse()
    const next = vi.fn()

    createAuthMiddleware('secret', ['first@example.com', 'second@example.com'])(
      request as never,
      response as never,
      next
    )

    expect(response.status).toHaveBeenCalledWith(403)
    expect(response.json).toHaveBeenCalledWith({ error: 'email_not_allowed' })
    expect(next).not.toHaveBeenCalled()
  })

  it('accepts an allowlisted email without case sensitivity', () => {
    const token = jwt.sign({ sub: 'user-1', email: 'FIRST@example.com' }, 'secret')
    const request = { headers: { authorization: `Bearer ${token}` } }
    const response = createResponse()
    const next = vi.fn()

    createAuthMiddleware('secret', ['first@example.com'])(
      request as never,
      response as never,
      next
    )

    expect(next).toHaveBeenCalledOnce()
    expect(response.status).not.toHaveBeenCalled()
  })

  it('accepts a WeChat token without an email allowlist entry', () => {
    const token = jwt.sign({ sub: 'wechat-user', authProvider: 'wechat' }, 'secret')
    const request = { headers: { authorization: `Bearer ${token}` } }
    const response = createResponse()
    const next = vi.fn()

    createAuthMiddleware('secret', ['legacy@example.com'])(
      request as never,
      response as never,
      next
    )

    expect(next).toHaveBeenCalledOnce()
    expect(response.status).not.toHaveBeenCalled()
  })
})
