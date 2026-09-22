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
    imageDailyLimit: 30,
    videoDailyLimit: 10,
    inviteMaxFailuresPerDay: 3,
    maxPromptLength: 4000,
    enabledModels: ['openai/gpt-5.4-image-2', 'openai/gpt-5.5'],
    promptModel: 'text-model'
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

  it('lists enabled models without any secrets', async () => {
    const response = await request(createApp(vi.fn() as typeof fetch)).get('/api/images/models')

    expect(response.status).toBe(200)
    expect(response.body.models).toEqual([
      { id: 'openai/gpt-5.4-image-2', kind: 'image', label: expect.any(String) },
      { id: 'openai/gpt-5.5', kind: 'image', label: expect.any(String) }
    ])
    expect(JSON.stringify(response.body)).not.toContain('upstream-secret')
  })

  it('accepts a task submission and exposes its result through polling', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      choices: [{ message: { images: [{ image_url: { url: 'https://cdn.example.com/result.png' } }] } }]
    }), { status: 200 }))
    const app = createApp(fetcher)

    const submitted = await request(app)
      .post('/api/images/tasks')
      .set('authorization', 'Bearer friends-only')
      .send({ prompt: '一只猫', model: 'openai/gpt-5.5', size: '1024x1024' })

    expect(submitted.status).toBe(202)
    expect(submitted.body).toMatchObject({ model: 'openai/gpt-5.5', kind: 'image', status: 'running' })

    const polled = await request(app)
      .get(`/api/images/tasks/${submitted.body.id}`)
      .set('authorization', 'Bearer friends-only')

    expect(polled.status).toBe(200)
    expect(polled.body).toMatchObject({ status: 'succeeded', data: [{ url: 'https://cdn.example.com/result.png' }] })
  })

  it('guards task endpoints with the invite code and 404 for unknown ids', async () => {
    const app = createApp(vi.fn() as typeof fetch)

    const denied = await request(app)
      .post('/api/images/tasks')
      .set('authorization', 'Bearer wrong-code')
      .send({ prompt: '一只猫' })
    expect(denied.status).toBe(401)
    expect(denied.body.error).toBe('invalid_invite_code')

    const missing = await request(app)
      .get('/api/images/tasks/no-such-id')
      .set('authorization', 'Bearer friends-only')
    expect(missing.status).toBe(404)
    expect(missing.body.error).toBe('task_not_found')
  })

  it('reports per-kind remaining quota and invite attempts without consuming them', async () => {
    const app = createApp(vi.fn() as typeof fetch)

    const before = await request(app).get('/api/images/quota').set('authorization', 'Bearer friends-only')
    expect(before.status).toBe(200)
    expect(before.body).toEqual({
      perMinuteLimit: 3,
      imageDailyLimit: 30,
      videoDailyLimit: 10,
      minuteRemaining: 3,
      imageRemaining: 30,
      videoRemaining: 10,
      attemptsRemaining: 3
    })

    const unauthorized = await request(app).get('/api/images/quota').set('authorization', 'Bearer wrong-code')
    expect(unauthorized.status).toBe(401)
    expect(unauthorized.body.error).toBe('invalid_invite_code')
    expect(unauthorized.body.attemptsRemaining).toBe(2)

    const after = await request(app).get('/api/images/quota').set('authorization', 'Bearer friends-only')
    expect(after.body).toEqual({
      perMinuteLimit: 3,
      imageDailyLimit: 30,
      videoDailyLimit: 10,
      minuteRemaining: 3,
      imageRemaining: 30,
      videoRemaining: 10,
      attemptsRemaining: 2
    })
  })

  it('locks the ip for the rest of the day after the third invite failure', async () => {
    const app = createApp(vi.fn() as typeof fetch)
    for (let attempt = 0; attempt < 3; attempt++) {
      const denied = await request(app).get('/api/images/quota').set('authorization', 'Bearer wrong-code')
      expect(denied.status).toBe(401)
    }
    const locked = await request(app).get('/api/images/quota').set('authorization', 'Bearer friends-only')
    expect(locked.status).toBe(403)
    expect(locked.body.error).toBe('invite_locked')

    const lockedTask = await request(app)
      .post('/api/images/tasks')
      .set('authorization', 'Bearer friends-only')
      .send({ prompt: '一只猫' })
    expect(lockedTask.status).toBe(403)
    expect(lockedTask.body.error).toBe('invite_locked')
  })

  it('optimizes prompts behind a separate rate limit', async () => {
    const fetcher: typeof fetch = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body))
      if (body.model === 'text-model') {
        return new Response(JSON.stringify({ choices: [{ message: { content: '优化后的完整提示词' } }] }), { status: 200 })
      }
      throw new Error('unexpected model ' + body.model)
    })
    const app = createApp(fetcher)

    const optimized = await request(app)
      .post('/api/images/optimize')
      .set('authorization', 'Bearer friends-only')
      .send({ prompt: '一只猫', kind: 'image' })
    expect(optimized.status).toBe(200)
    expect(optimized.body.prompt).toBe('优化后的完整提示词')

    const denied = await request(app)
      .post('/api/images/optimize')
      .set('authorization', 'Bearer wrong-code')
      .send({ prompt: '一只猫' })
    expect(denied.status).toBe(401)

    const invalidPrompt = await request(app)
      .post('/api/images/optimize')
      .set('authorization', 'Bearer friends-only')
      .send({ prompt: '   ' })
    expect(invalidPrompt.status).toBe(400)
    expect(invalidPrompt.body.error).toBe('invalid_prompt')
  })
})
