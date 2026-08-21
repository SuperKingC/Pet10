import express from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createRoomRoutes } from './roomRoutes.js'

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
