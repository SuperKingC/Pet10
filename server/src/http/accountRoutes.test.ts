import express from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createAccountRoutes } from './accountRoutes.js'

describe('account routes', () => {
  it('deactivates the authenticated account', async () => {
    const deactivate = vi.fn(async () => ({ deactivated: true }))
    const app = express()
    app.use((_request, _response, next) => {
      ;(_request as { userId?: string }).userId = 'user-1'
      next()
    })
    app.use(createAccountRoutes({ deactivate }))

    const response = await request(app)
      .post('/deactivate')
      .set('authorization', 'Bearer test-token')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ deactivated: true })
    expect(deactivate).toHaveBeenCalledWith('user-1')
  })
})
