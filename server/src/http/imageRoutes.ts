import { Router } from 'express'
import type { ServerConfig } from '../config.js'
import { createImageGenerationService, ImageGenerationError } from '../services/imageGenerationService.js'

export function createImageRoutes(config: Pick<ServerConfig, 'image'>, fetcher: typeof fetch = fetch) {
  const router = Router()
  const service = createImageGenerationService({ inviteCode: config.image.inviteCode, upstreamBaseUrl: config.image.upstreamBaseUrl, upstreamApiKey: config.image.upstreamApiKey, rateLimitPerMinute: config.image.rateLimitPerMinute, dailyLimit: config.image.dailyLimit, maxPromptLength: config.image.maxPromptLength }, fetcher)
  router.post('/generations', async (request, response) => {
    const startedAt = performance.now()
    const auth = request.header('authorization') ?? ''
    const inviteCode = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : ''
    const body = request.body as Record<string, unknown>
    try {
      const data = await service.generate({ inviteCode, ip: request.ip || request.socket.remoteAddress || 'unknown', prompt: typeof body.prompt === 'string' ? body.prompt : '', model: typeof body.model === 'string' ? body.model : undefined, size: typeof body.size === 'string' ? body.size : undefined, n: body.n === undefined ? undefined : Number(body.n), referenceImages: Array.isArray(body.referenceImages) && body.referenceImages.every(image => typeof image === 'string') ? body.referenceImages : body.referenceImages === undefined ? undefined : [''] })
      response.json({ ...data, durationMs: Math.round(performance.now() - startedAt) })
    } catch (error) {
      const code = error instanceof Error ? error.message : 'internal'
      const durationMs = Math.round(performance.now() - startedAt)
      const upstreamCode = error instanceof ImageGenerationError ? error.upstreamCode : undefined
      const requestId = error instanceof ImageGenerationError ? error.requestId : undefined
      const status = code === 'unauthorized' ? 401 : code === 'rate_limit' ? 429 : code.startsWith('invalid') && code !== 'upstream_invalid_response' ? 400 : code === 'upstream_rejected' ? 502 : 503
      const publicError = code === 'unauthorized' ? 'invalid_invite_code' : code === 'rate_limit' ? 'rate_limit_exceeded' : code.startsWith('invalid') && code !== 'upstream_invalid_response' ? code : 'image_generation_unavailable'
      if (status >= 500) {
        console.error(JSON.stringify({
          event: 'image_generation_failed',
          status,
          error: publicError,
          ...(upstreamCode === undefined ? {} : { upstreamCode }),
          ...(requestId === undefined ? {} : { requestId }),
          durationMs
        }))
      }
      response.status(status).json({
        error: publicError,
        durationMs,
        ...(upstreamCode === undefined ? {} : { upstreamCode }),
        ...(requestId === undefined ? {} : { requestId })
      })
    }
  })
  return router
}
