import express from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createAuthRoutes } from './authRoutes.js'
import { resolveErrorResponse } from './errorResponse.js'

function createApp(
  service: Parameters<typeof createAuthRoutes>[0],
  options?: Parameters<typeof createAuthRoutes>[1]
) {
  const app = express()
  app.use(express.json())
  app.use('/api/auth', createAuthRoutes(service, options))
  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const result = resolveErrorResponse(error)
    response.status(result.status).json({ error: result.error })
  })
  return app
}

describe('auth routes', () => {
  it('returns the session for a valid WeChat login', async () => {
    const loginWithWechat = vi.fn(async () => ({ token: 'jwt', user: { id: 'user-1' } }))

    const response = await request(createApp({ loginWithWechat }))
      .post('/api/auth/wechat')
      .send({ code: 'wx-code', profile: { displayName: '小明' } })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ token: 'jwt', user: { id: 'user-1' } })
    expect(loginWithWechat).toHaveBeenCalledWith('wx-code', { displayName: '小明' })
  })

  it('returns 503 when WeChat login is not configured', async () => {
    const response = await request(createApp({}))
      .post('/api/auth/wechat')
      .send({ code: 'wx-code' })

    expect(response.status).toBe(503)
    expect(response.body.error).toBe('wechat_login_not_configured')
  })

  it('rejects a request without a login code', async () => {
    const response = await request(createApp({ loginWithWechat: async () => ({}) }))
      .post('/api/auth/wechat')
      .send({})

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('invalid_input')
  })

  it('rate limits the anonymous login endpoint', async () => {
    const app = createApp({ loginWithWechat: async () => ({ token: 'jwt' }) }, { rateLimitPerMinute: 2 })

    const first = await request(app).post('/api/auth/wechat').send({ code: 'a' })
    const second = await request(app).post('/api/auth/wechat').send({ code: 'b' })
    const third = await request(app).post('/api/auth/wechat').send({ code: 'c' })

    expect([first.status, second.status]).toEqual([200, 200])
    expect(third.status).toBe(429)
    expect(third.body.error).toBe('rate_limit_exceeded')
  })

  it('no longer exposes the email login code endpoints', async () => {
    const app = createApp({ loginWithWechat: async () => ({ token: 'jwt' }) })

    const requested = await request(app).post('/api/auth/request-code').send({ email: 'a@b.com', inviteCode: 'X' })
    const verified = await request(app).post('/api/auth/verify-code').send({ email: 'a@b.com', code: '123456' })

    expect(requested.status).toBe(404)
    expect(verified.status).toBe(404)
  })
})
