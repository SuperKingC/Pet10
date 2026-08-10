import express from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createImageRoutes } from './imageRoutes.js'

const config = {
  image: {
    inviteCode: 'friends-only',
    upstreamBaseUrl: 'https://example.com/v1',
    upstreamApiKey: 'upstream-secret',
    rateLimitPerMinute: 3,
    dailyLimit: 30,
    maxPromptLength: 4000
  }
}

function createApp(fetcher: typeof fetch) {
  const app = express()
  app.use(express.json())
  app.use('/api/images', createImageRoutes(config, fetcher))
  return app
}

describe('image generation routes', () => {
  it('returns durationMs on successful generation', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      choices: [{ message: { images: [{ image_url: { url: 'https://cdn.example.com/result.png' } }] } }]
    }), { status: 200 }))

    const response = await request(createApp(fetcher as typeof fetch))
      .post('/api/images/generations')
      .set('authorization', 'Bearer friends-only')
      .send({ prompt: '一只猫' })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ data: [{ url: 'https://cdn.example.com/result.png' }] })
    expect(response.body.durationMs).toEqual(expect.any(Number))
  })

  it('returns safe diagnostics for an embedded upstream error', async () => {
    const logger = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const fetcher: typeof fetch = vi.fn(async () => new Response(JSON.stringify({
      error: {
        message: 'sensitive prompt and account details req_route_error',
        code: 502
      }
    }), { status: 200 }))
    const response = await request(createApp(fetcher))
      .post('/api/images/generations')
      .set('authorization', 'Bearer friends-only')
      .send({ prompt: '不要出现在日志里的提示词' })

    expect(response.status).toBe(503)
    expect(response.body).toMatchObject({
      error: 'image_generation_unavailable',
      upstreamCode: 502,
      requestId: 'req_route_error',
      durationMs: expect.any(Number)
    })
    expect(JSON.stringify(response.body)).not.toContain('sensitive prompt')
    logger.mockRestore()
  })

  it('logs diagnostics without prompt or upstream key', async () => {
    const logger = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const fetcher: typeof fetch = vi.fn(async () => new Response(JSON.stringify({
      error: { code: 502, message: 'secret prompt req_log_error' }
    }), { status: 200 }))
    const response = await request(createApp(fetcher))
      .post('/api/images/generations')
      .set('authorization', 'Bearer friends-only')
      .send({ prompt: '日志中不应出现的提示词' })

    expect(response.status).toBe(503)
    expect(logger).toHaveBeenCalledWith(expect.stringContaining('"upstreamCode":502'))
    expect(logger.mock.calls[0]?.[0]).not.toContain('日志中不应出现的提示词')
    expect(logger.mock.calls[0]?.[0]).not.toContain('upstream-secret')
    logger.mockRestore()
  })
})
