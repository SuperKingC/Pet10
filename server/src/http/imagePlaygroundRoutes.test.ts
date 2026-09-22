import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createImagePlaygroundRoutes } from './imagePlaygroundRoutes.js'

function createApp() {
  const app = express()
  app.use('/image-playground', createImagePlaygroundRoutes())
  return app
}

describe('image playground route', () => {
  it('serves the browser test page without any embedded invite code', async () => {
    const response = await request(createApp()).get('/image-playground')

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toContain('text/html')
    expect(response.headers['x-robots-tag']).toBe('noindex')
    expect(response.text).toContain('生图测试台')
    expect(response.text).toContain('/api/images/generations')
    expect(response.text).not.toContain('Bearer sk-')
  })
})
