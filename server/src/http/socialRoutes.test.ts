import express from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createSocialRoutes } from './socialRoutes.js'
import { resolveErrorResponse } from './errorResponse.js'

function createApp(social: Record<string, unknown>) {
  const app = express()
  app.use(express.json())
  app.use((_request, _response, next) => {
    ;(_request as { userId?: string }).userId = 'user-1'
    next()
  })
  app.use(createSocialRoutes({ social: social as never, pets: {} as never }))
  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const result = resolveErrorResponse(error)
    response.status(result.status).json({ error: result.error })
  })
  return app
}

const stored = {
  id: 'anniv-1', roomId: 'room-1', userId: 'user-1', name: '恋爱纪念日',
  icon: 'heart', note: '在一起', day: '2025-02-14', repeatRule: 'yearly'
}

describe('anniversary routes', () => {
  it('lists anniversaries for a room', async () => {
    const listAnniversaries = vi.fn(async () => [stored])
    const response = await request(createApp({ listAnniversaries })).get('/rooms/room-1/anniversaries')
    expect(response.status).toBe(200)
    expect(listAnniversaries).toHaveBeenCalledWith('room-1', 'user-1')
    expect(response.body).toHaveLength(1)
  })

  it('creates an anniversary with validated input', async () => {
    const createAnniversary = vi.fn(async () => stored)
    const response = await request(createApp({ createAnniversary }))
      .post('/rooms/room-1/anniversaries')
      .send({ name: '恋爱纪念日', icon: 'heart', note: '在一起', day: '2025-02-14', repeatRule: 'yearly' })
    expect(response.status).toBe(201)
    expect(createAnniversary).toHaveBeenCalledWith('room-1', 'user-1', expect.objectContaining({ name: '恋爱纪念日', icon: 'heart', note: '在一起', day: '2025-02-14', repeatRule: 'yearly' }))
  })

  it('rejects unknown icons', async () => {
    const response = await request(createApp({}))
      .post('/rooms/room-1/anniversaries')
      .send({ name: 'x', icon: 'rocket', day: '2025-02-14' })
    expect(response.status).toBe(400)
  })

  it('updates an anniversary', async () => {
    const updateAnniversary = vi.fn(async () => ({ ...stored, icon: 'star' }))
    const response = await request(createApp({ updateAnniversary }))
      .put('/rooms/room-1/anniversaries/anniv-1')
      .send({ icon: 'star' })
    expect(response.status).toBe(200)
    expect(updateAnniversary).toHaveBeenCalledWith('room-1', 'user-1', 'anniv-1', { icon: 'star' })
  })

  it('deletes an anniversary', async () => {
    const deleteAnniversary = vi.fn(async () => ({ ok: true }))
    const response = await request(createApp({ deleteAnniversary })).delete('/rooms/room-1/anniversaries/anniv-1')
    expect(response.status).toBe(200)
    expect(deleteAnniversary).toHaveBeenCalledWith('room-1', 'user-1', 'anniv-1')
  })
})
