import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createSessionRoutes } from './sessionRoutes.js'

describe('session routes', () => {
  it('returns launch context for the authenticated user', async () => {
    const app = express()
    app.use((_request, _response, next) => {
      ;(_request as { userId?: string }).userId = 'user-1'
      next()
    })
    app.use(createSessionRoutes({
      getHome: async () => ({ status: 'unbound' }),
      getLaunchContext: async (userId, options) => ({
        userId,
        activeRoomId: options?.activeRoomId,
        assetVersion: options?.assetVersion,
        entry: 'waiting-room'
      }),
      updateUsername: async () => ({}),
      updateProfile: async () => ({})
    }))

    const response = await request(app)
      .get('/launch-context?activeRoomId=room-1&assetVersion=asset-1')
      .set('authorization', 'Bearer test-token')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      userId: 'user-1',
      activeRoomId: 'room-1',
      assetVersion: 'asset-1',
      entry: 'waiting-room'
    })
  })
})
