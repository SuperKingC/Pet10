import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { resolveErrorResponse } from './errorResponse.js'
import { createGmRoutes } from './gmRoutes.js'

function buildApp(service: Parameters<typeof createGmRoutes>[0]) {
  const app = express()
  app.use(express.json())
  app.use((_request, _response, next) => {
    ;(_request as { userId?: string }).userId = 'user-1'
    next()
  })
  app.use(createGmRoutes(service))
  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const result = resolveErrorResponse(error)
    response.status(result.status).json({ error: result.error })
  })
  return app
}

describe('gm routes', () => {
  it('adds friends for the authenticated user', async () => {
    const app = buildApp({
      addFriends: async (userId, count) => ({
        added: Array.from({ length: count }, (_, index) => ({
          userId: `${userId}-friend-${index}`,
          displayName: `测试好友${index + 1}`
        }))
      })
    })

    const response = await request(app).post('/friends').send({ count: 2 })

    expect(response.status).toBe(201)
    expect(response.body.added).toHaveLength(2)
    expect(response.body.added[0].userId).toBe('user-1-friend-0')
  })

  it('rejects invalid count with 400', async () => {
    const app = buildApp({ addFriends: async () => ({ added: [] }) })

    const response = await request(app).post('/friends').send({ count: 99 })

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('invalid_count')
  })
})
