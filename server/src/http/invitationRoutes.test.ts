import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createInvitationRoutes } from './invitationRoutes.js'

describe('invitation routes', () => {
  it('creates and accepts an invitation with the authenticated user', async () => {
    const app = express()
    app.use((_request, _response, next) => {
      ;(_request as { userId?: string }).userId = 'user-1'
      next()
    })
    app.use(createInvitationRoutes({
      create: async (userId) => ({ token: 'token-1', inviterId: userId }),
      get: async (token) => ({ token }),
      accept: async (token, userId) => ({ token, userId }),
      decline: async (token, userId) => ({ token, userId })
    }))

    const createResponse = await request(app).post('/')
    const acceptResponse = await request(app).post('/token-1/accept')

    expect(createResponse.status).toBe(201)
    expect(createResponse.body).toEqual({ token: 'token-1', inviterId: 'user-1' })
    expect(acceptResponse.status).toBe(200)
    expect(acceptResponse.body).toEqual({ token: 'token-1', userId: 'user-1' })
  })
})
