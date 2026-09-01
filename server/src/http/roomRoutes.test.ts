import express from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createRoomRoutes } from './roomRoutes.js'
import { resolveErrorResponse } from './errorResponse.js'

describe('room routes', () => {
  it('lists recent room messages for the authenticated member', async () => {
    const listMessages = vi.fn(async (roomId: string, userId: string) => [{
      id: 'message-1',
      roomId,
      senderType: 'user',
      senderId: userId,
      kind: 'text',
      text: '你好',
      createdAt: new Date('2026-08-20T10:00:00.000Z'),
    }])
    const app = express()
    app.use((_request, _response, next) => {
      ;(_request as { userId?: string }).userId = 'user-1'
      next()
    })
    app.use(createRoomRoutes({
      rooms: {
        listMessages,
      } as never,
      pets: {} as never,
      emit: vi.fn(),
    }))

    const response = await request(app).get('/room-1/messages')

    expect(response.status).toBe(200)
    expect(listMessages).toHaveBeenCalledWith('room-1', 'user-1')
    expect(response.body).toEqual([{
      id: 'message-1',
      roomId: 'room-1',
      senderType: 'user',
      senderId: 'user-1',
      kind: 'text',
      text: '你好',
      createdAt: '2026-08-20T10:00:00.000Z',
    }])
  })
})

describe('pet actions route (feed item choice)', () => {
  function buildApp(dependencies: Record<string, unknown>) {
    const app = express()
    app.use(express.json())
    app.use((_request, _response, next) => {
      ;(_request as { userId?: string }).userId = 'user-1'
      next()
    })
    app.use(createRoomRoutes({ emit: vi.fn(), ...dependencies } as never))
    // 与 app.ts 一致的错误映射：ZodError → 400 invalid_input
    app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
      const resolved = resolveErrorResponse(error)
      response.status(resolved.status).json({ error: resolved.error })
    })
    return app
  }

  it('forwards chosen feed itemId into consume and outcome', async () => {
    const consumeForAction = vi.fn(async () => 'bone')
    const applyAction = vi.fn(async () => ({ id: 'pet-1', hunger: 80 }))
    const app = buildApp({
      pets: { applyAction },
      nestTasks: { consumeForAction, recordActionProgress: vi.fn() },
    })

    const response = await request(app)
      .post('/room-1/pet-actions')
      .send({ action: 'feed', itemId: 'bone' })

    expect(response.status).toBe(200)
    expect(consumeForAction).toHaveBeenCalledWith('room-1', 'user-1', 'feed', 'bone')
    expect(applyAction).toHaveBeenCalledWith('room-1', 'user-1', 'feed', 'bone')
  })

  it('keeps itemId undefined when the client does not choose one', async () => {
    const consumeForAction = vi.fn(async () => 'dog_food')
    const applyAction = vi.fn(async () => ({ id: 'pet-1' }))
    const app = buildApp({
      pets: { applyAction },
      nestTasks: { consumeForAction, recordActionProgress: vi.fn() },
    })

    const response = await request(app).post('/room-1/pet-actions').send({ action: 'feed' })

    expect(response.status).toBe(200)
    expect(consumeForAction).toHaveBeenCalledWith('room-1', 'user-1', 'feed', undefined)
  })

  it('rejects itemId outside the feed choices or on non-feed actions', async () => {
    const app = buildApp({
      pets: { applyAction: vi.fn() },
      nestTasks: { consumeForAction: vi.fn(), recordActionProgress: vi.fn() },
    })

    expect((await request(app).post('/room-1/pet-actions').send({ action: 'feed', itemId: 'soap' })).status).toBe(400)
    expect((await request(app).post('/room-1/pet-actions').send({ action: 'play', itemId: 'bone' })).status).toBe(400)
    expect((await request(app).post('/room-1/pet-actions').send({ action: 'play' })).status).toBe(200)
  })
})
