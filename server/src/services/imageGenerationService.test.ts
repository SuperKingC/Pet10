import { describe, expect, it, vi } from 'vitest'
import { createImageGenerationService, ImageGenerationError } from './imageGenerationService.js'

const config = {
  inviteCode: 'friends-only',
  upstreamBaseUrl: 'https://example.com/v1',
  upstreamApiKey: 'upstream-secret',
  rateLimitPerMinute: 3,
  dailyLimit: 30,
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

  it('rejects more than two reference images and unsupported data URLs', async () => {
    const service = createImageGenerationService(config, vi.fn() as typeof fetch)
    const png = 'data:image/png;base64,aA=='
    await expect(service.generate({ inviteCode: 'friends-only', ip: '127.0.0.5', prompt: 'test', referenceImages: [png, png, png] })).rejects.toThrow('invalid_reference_images')
    await expect(service.generate({ inviteCode: 'friends-only', ip: '127.0.0.6', prompt: 'test', referenceImages: ['data:image/svg+xml;base64,PHN2Zz4='] })).rejects.toThrow('invalid_reference_image')
  })

  it('consumes the rate limit even when the invite code is wrong', async () => {
    const service = createImageGenerationService({ ...config, rateLimitPerMinute: 2 }, vi.fn() as typeof fetch)
    await expect(service.generate({ inviteCode: 'wrong-code', ip: '10.9.9.9', prompt: 'test' })).rejects.toThrow('unauthorized')
    await expect(service.generate({ inviteCode: 'wrong-code', ip: '10.9.9.9', prompt: 'test' })).rejects.toThrow('unauthorized')
    await expect(service.generate({ inviteCode: 'friends-only', ip: '10.9.9.9', prompt: 'test' })).rejects.toThrow('rate_limit')
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
    await expect(service.generate({ inviteCode: 'friends-only', ip: '10.9.8.3', prompt: '一只猫', model: 'openai/sora-2' })).rejects.toThrow('invalid_model')
    await service.generate({ inviteCode: 'friends-only', ip: '10.9.8.4', prompt: '一只猫' })
  })

  it('rejects every attempt while no invite code is configured', async () => {
    const fetcher = vi.fn(async () => new Response('{}', { status: 200 }))
    const service = createImageGenerationService({ ...config, inviteCode: '', rateLimitPerMinute: 3 }, fetcher as typeof fetch)
    await expect(service.generate({ inviteCode: 'anything', ip: '10.9.9.8', prompt: 'test' })).rejects.toThrow('unauthorized')
    expect(fetcher).not.toHaveBeenCalled()
  })
})
