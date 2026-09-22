import { describe, expect, it, vi } from 'vitest'
import { createImageGenerationService, ImageGenerationError } from './imageGenerationService.js'

const config = {
  inviteCode: 'friends-only',
  upstreamBaseUrl: 'https://example.com/v1',
  upstreamApiKey: 'upstream-secret',
  rateLimitPerMinute: 3,
  imageDailyLimit: 30,
  maxPromptLength: 4000
}

describe('image generation service', () => {
  it('maps a generation request to chat completions and normalizes its image response', async () => {
    let requestedUrl = ''
    let requestedInit: RequestInit | undefined
    const fetcher: typeof fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      requestedUrl = String(input)
      requestedInit = init
      return new Response(JSON.stringify({
        choices: [{ message: { images: [{ image_url: { url: 'data:image/png;base64,aGVsbG8=' } }] } }]
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    })
    const service = createImageGenerationService(config, fetcher)

    const result = await service.generate({ inviteCode: 'friends-only', ip: '127.0.0.1', prompt: '一只猫', size: '1024x1536', n: 1 })

    expect(requestedUrl).toBe('https://example.com/v1/chat/completions')
    expect(requestedInit?.headers).toEqual(expect.objectContaining({ authorization: 'Bearer upstream-secret' }))
    const request = JSON.parse(String(requestedInit?.body))
    expect(request).toEqual({
      model: 'openai/gpt-5.4-image-2',
      messages: [{ role: 'user', content: '一只猫' }],
      modalities: ['image'],
      image_config: { aspect_ratio: '2:3', image_size: '2K' }
    })
    expect(result).toEqual({ data: [{ b64_json: 'aGVsbG8=' }] })
  })

  it('normalizes an upstream https image URL', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      choices: [{ message: { images: [{ image_url: { url: 'https://cdn.example.com/image.png' } }] } }]
    }), { status: 200 }))
    const service = createImageGenerationService(config, fetcher as typeof fetch)
    await expect(service.generate({ inviteCode: 'friends-only', ip: '127.0.0.2', prompt: 'landscape' }))
      .resolves.toEqual({ data: [{ url: 'https://cdn.example.com/image.png' }] })
  })

  it('rejects a response without an image', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: {} }] }), { status: 200 }))
    const service = createImageGenerationService(config, fetcher as typeof fetch)
    await expect(service.generate({ inviteCode: 'friends-only', ip: '127.0.0.3', prompt: 'empty' }))
      .rejects.toThrow('upstream_invalid_response')
  })

  it('preserves safe diagnostics from an HTTP 200 upstream error payload', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      error: {
        message: 'sensitive upstream details',
        code: 502,
        request_id: 'req_embedded_error'
      }
    }), { status: 200 }))
    const service = createImageGenerationService(config, fetcher as typeof fetch)

    const error = await service.generate({
      inviteCode: 'friends-only',
      ip: '127.0.0.7',
      prompt: 'test'
    }).catch(caught => caught)

    expect(error).toBeInstanceOf(ImageGenerationError)
    expect(error).toMatchObject({
      message: 'upstream_unavailable',
      upstreamCode: 502,
      requestId: 'req_embedded_error'
    })
    expect(JSON.stringify(error)).not.toContain('sensitive upstream details')
  })

  it('preserves safe diagnostics from a rejected upstream response', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      error: {
        message: 'account rejected',
        code: 403
      },
      request_id: 'req_rejected'
    }), { status: 403 }))
    const service = createImageGenerationService(config, fetcher as typeof fetch)

    const error = await service.generate({
      inviteCode: 'friends-only',
      ip: '127.0.0.8',
      prompt: 'test'
    }).catch(caught => caught)

    expect(error).toBeInstanceOf(ImageGenerationError)
    expect(error).toMatchObject({
      message: 'upstream_rejected',
      upstreamCode: 403,
      requestId: 'req_rejected'
    })
    expect(JSON.stringify(error)).not.toContain('account rejected')
  })

  it('maps valid reference images into multimodal message content', async () => {
    let requestedInit: RequestInit | undefined
    const fetcher: typeof fetch = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      requestedInit = init
      return new Response(JSON.stringify({ choices: [{ message: { images: [{ image_url: { url: 'https://cdn.example.com/result.png' } }] } }] }), { status: 200 })
    })
    const service = createImageGenerationService(config, fetcher)
    const reference = 'data:image/png;base64,aGVsbG8='

    await service.generate({ inviteCode: 'friends-only', ip: '127.0.0.4', prompt: '保持构图', referenceImages: [reference] })

    const request = JSON.parse(String(requestedInit?.body))
    expect(request.messages[0].content).toEqual([
      { type: 'text', text: '保持构图' },
      { type: 'image_url', image_url: { url: reference } }
    ])
  })

  it('rejects more than five reference images and unsupported data URLs', async () => {
    const fetcher: typeof fetch = vi.fn(async () => new Response(JSON.stringify({
      choices: [{ message: { images: [{ image_url: { url: 'https://cdn.example.com/result.png' } }] } }]
    }), { status: 200 }))
    const service = createImageGenerationService(config, fetcher)
    const png = 'data:image/png;base64,aA=='
    await expect(service.generate({ inviteCode: 'friends-only', ip: '127.0.0.5', prompt: 'test', referenceImages: [png, png, png] })).resolves.toBeDefined()
    await expect(service.generate({ inviteCode: 'friends-only', ip: '127.0.0.5', prompt: 'test', referenceImages: [png, png, png, png, png, png] })).rejects.toThrow('invalid_reference_images')
    await expect(service.generate({ inviteCode: 'friends-only', ip: '127.0.0.6', prompt: 'test', referenceImages: ['data:image/svg+xml;base64,PHN2Zz4='] })).rejects.toThrow('invalid_reference_image')
  })

  it('consumes minute and image daily quota only on authorized attempts', async () => {
    const fetcher: typeof fetch = vi.fn(async () => new Response(JSON.stringify({
      choices: [{ message: { images: [{ image_url: { url: 'https://cdn.example.com/result.png' } }] } }]
    }), { status: 200 }))
    const service = createImageGenerationService({ ...config, rateLimitPerMinute: 1, imageDailyLimit: 2 }, fetcher)
    // 错误邀请码不消耗生成额度
    await expect(service.generate({ inviteCode: 'wrong-code', ip: '10.9.9.9', prompt: 'test' })).rejects.toThrow('unauthorized')
    await service.generate({ inviteCode: 'friends-only', ip: '10.9.9.9', prompt: 'test' })
    // 分钟池已满
    await expect(service.generate({ inviteCode: 'friends-only', ip: '10.9.9.9', prompt: 'test' })).rejects.toThrow('rate_limit')
    // 日池独立 IP 不受影响，2 张后打满
    await service.generate({ inviteCode: 'friends-only', ip: '10.9.9.8', prompt: 'test' })
    await expect(service.generate({ inviteCode: 'friends-only', ip: '10.9.9.8', prompt: 'test' })).rejects.toThrow('rate_limit')
  })

  it('routes enabled models into the upstream request and rejects disabled ones', async () => {
    let requestedModel = ''
    const fetcher: typeof fetch = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      requestedModel = JSON.parse(String(init?.body)).model
      return new Response(JSON.stringify({
        choices: [{ message: { images: [{ image_url: { url: 'https://cdn.example.com/result.png' } }] } }]
      }), { status: 200 })
    })
    const service = createImageGenerationService({ ...config, enabledModels: ['openai/gpt-5.4-image-2', 'openai/gpt-5.5'] }, fetcher)
    await service.generate({ inviteCode: 'friends-only', ip: '10.9.8.1', prompt: '一只猫', model: 'openai/gpt-5.5' })
    expect(requestedModel).toBe('openai/gpt-5.5')
    expect(service.listModels().map((model) => model.id)).toEqual(['openai/gpt-5.4-image-2', 'openai/gpt-5.5'])
    await expect(service.generate({ inviteCode: 'friends-only', ip: '10.9.8.2', prompt: '一只猫', model: 'openai/sora-2' })).rejects.toThrow('invalid_model')
  })

  it('rejects video models on the synchronous endpoint and falls back to the default model', async () => {
    const fetcher: typeof fetch = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body)).model).toBe('openai/gpt-5.4-image-2')
      return new Response(JSON.stringify({
        choices: [{ message: { images: [{ image_url: { url: 'https://cdn.example.com/result.png' } }] } }]
      }), { status: 200 })
    })
    const service = createImageGenerationService(config, fetcher)
    await expect(service.generate({ inviteCode: 'friends-only', ip: '10.9.8.3', prompt: '一只猫', model: 'kwaivgi/kling-v3.0-std' })).rejects.toThrow('invalid_model')
    await service.generate({ inviteCode: 'friends-only', ip: '10.9.8.4', prompt: '一只猫' })
  })

  it('omits image_config for non-openai image models', async () => {
    let requestBody: Record<string, unknown> | undefined
    const fetcher: typeof fetch = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body))
      return new Response(JSON.stringify({
        choices: [{ message: { images: [{ image_url: { url: 'https://cdn.example.com/result.png' } }] } }]
      }), { status: 200 })
    })
    const service = createImageGenerationService({ ...config, enabledModels: ['google/gemini-3.1-flash-image-preview'] }, fetcher)
    await service.generate({ inviteCode: 'friends-only', ip: '10.9.8.5', prompt: '一只猫' })
    expect(requestBody?.model).toBe('google/gemini-3.1-flash-image-preview')
    expect(requestBody?.image_config).toBeUndefined()
  })

  it('runs the relay video flow: create with resolution and first frame, poll, download via content proxy', async () => {
    const calls: Array<{ url: string; body?: Record<string, unknown> }> = []
    const fetcher: typeof fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined })
      if (url.endsWith('/videos')) return new Response(JSON.stringify({ id: 'job-1' }), { status: 200 })
      if (url.endsWith('/videos/job-1')) return new Response(JSON.stringify({ status: 'completed', unsigned_urls: ['https://upstream.example.com/clip.mp4'] }), { status: 200 })
      if (url.endsWith('/videos/job-1/content')) return new Response(new Uint8Array([0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]), { status: 200, headers: { 'content-type': 'video/mp4' } })
      throw new Error(`unexpected fetch: ${url}`)
    })
    const service = createImageGenerationService({ ...config, videoPollIntervalMs: 1 }, fetcher)
    const result = await service.generateVideo({
      prompt: '小狗在草地上奔跑',
      model: 'kwaivgi/kling-v3.0-std',
      resolution: '720p',
      referenceImages: ['data:image/png;base64,aGVsbG8=']
    })
    expect(result.data[0]).toEqual({ b64_json: 'ZnR5cGlzb20=', mime: 'video/mp4' })
    expect(calls[0]).toMatchObject({
      url: 'https://example.com/v1/videos',
      body: {
        model: 'kwaivgi/kling-v3.0-std',
        prompt: '小狗在草地上奔跑',
        resolution: '720p',
        frame_images: [{ type: 'image_url', image_url: { url: 'data:image/png;base64,aGVsbG8=' }, frame_type: 'first_frame' }]
      }
    })
    expect(calls[1]?.url).toBe('https://example.com/v1/videos/job-1')
    expect(calls[2]?.url).toBe('https://example.com/v1/videos/job-1/content')
  })

  it('falls back to the unsigned direct url when the content proxy fails', async () => {
    const fetcher: typeof fetch = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.endsWith('/videos')) return new Response(JSON.stringify({ id: 'job-2' }), { status: 200 })
      if (url.endsWith('/videos/job-2')) return new Response(JSON.stringify({ status: 'completed', unsigned_urls: ['https://cdn.example.com/clip.mp4'] }), { status: 200 })
      if (url.endsWith('/videos/job-2/content')) return new Response('proxy down', { status: 502 })
      if (url === 'https://cdn.example.com/clip.mp4') return new Response(new Uint8Array([0x01, 0x02, 0x03]), { status: 200 })
      throw new Error(`unexpected fetch: ${url}`)
    })
    const service = createImageGenerationService({ ...config, videoPollIntervalMs: 1 }, fetcher)
    const result = await service.generateVideo({ prompt: '测试', model: 'kwaivgi/kling-v3.0-std' })
    expect(result.data[0]).toMatchObject({ mime: 'video/mp4' })
  })

  it('surfaces upstream video rejection without leaking internals', async () => {
    const fetcher: typeof fetch = vi.fn(async () => new Response(JSON.stringify({
      error: { message: 'sensitive account details', code: 400 }
    }), { status: 200 }))
    const service = createImageGenerationService({ ...config, videoPollIntervalMs: 1 }, fetcher)
    const error = await service.generateVideo({ prompt: '测试', model: 'kwaivgi/kling-v3.0-std' }).catch(caught => caught)
    expect(error).toBeInstanceOf(ImageGenerationError)
    expect(error.message).toBe('upstream_rejected')
    expect(JSON.stringify(error)).not.toContain('sensitive account details')
  })

  it('rejects every attempt while no invite code is configured', async () => {
    const fetcher = vi.fn(async () => new Response('{}', { status: 200 }))
    const service = createImageGenerationService({ ...config, inviteCode: '', rateLimitPerMinute: 3 }, fetcher as typeof fetch)
    await expect(service.generate({ inviteCode: 'anything', ip: '10.9.9.8', prompt: 'test' })).rejects.toThrow('unauthorized')
    expect(fetcher).not.toHaveBeenCalled()
  })
})
