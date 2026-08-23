import { describe, expect, it, vi } from 'vitest'
import { requestImageGeneration } from './imageGenerationApi'

describe('requestImageGeneration', () => {
  it('sends the invite and generation payload and parses JSON responses', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ data: [{ url: 'https://cdn.example/image.png' }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))

    await expect(requestImageGeneration({
      invite: 'invite-1',
      prompt: 'a small dog',
      size: '1024x1024',
      referenceImages: ['data:image/jpeg;base64,abc'],
    }, fetcher)).resolves.toEqual({ data: [{ url: 'https://cdn.example/image.png' }] })

    expect(fetcher).toHaveBeenCalledWith('/api/images/generations', expect.objectContaining({
      method: 'POST',
      headers: { authorization: 'Bearer invite-1', 'content-type': 'application/json' },
    }))
  })

  it('rejects non-JSON responses with the existing deployment message', async () => {
    const fetcher = vi.fn(async () => new Response('not found', { status: 404 }))

    await expect(requestImageGeneration({ invite: 'invite-1', prompt: 'dog', size: '1024x1024', referenceImages: [] }, fetcher))
      .rejects.toThrow('生图接口尚未部署，请更新并重启 API 服务')
  })
  it('keeps structured error payloads for non-2xx JSON responses', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      error: 'image_generation_unavailable',
      upstreamCode: 502,
      requestId: 'req-1',
    }), { status: 503, headers: { 'content-type': 'application/json' } }))

    await expect(requestImageGeneration({ invite: 'invite-1', prompt: 'dog', size: '1024x1024', referenceImages: [] }, fetcher))
      .resolves.toMatchObject({ error: 'image_generation_unavailable', upstreamCode: 502, httpStatus: 503 })
  })
})
