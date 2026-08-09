import { Router } from 'express'
import type { ServerConfig } from '../config.js'
import { createImageGenerationService } from '../services/imageGenerationService.js'

export function createImageRoutes(config: ServerConfig) {
  const router = Router()
  const service = createImageGenerationService({ inviteCode: config.image.inviteCode, upstreamBaseUrl: config.image.upstreamBaseUrl, upstreamApiKey: config.image.upstreamApiKey, rateLimitPerMinute: config.image.rateLimitPerMinute, dailyLimit: config.image.dailyLimit, maxPromptLength: config.image.maxPromptLength })
  router.post('/generations', async (request, response) => {
    const auth = request.header('authorization') ?? ''
    const inviteCode = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : ''
    const body = request.body as Record<string, unknown>
    try {
      const data = await service.generate({ inviteCode, ip: request.ip || request.socket.remoteAddress || 'unknown', prompt: typeof body.prompt === 'string' ? body.prompt : '', model: typeof body.model === 'string' ? body.model : undefined, size: typeof body.size === 'string' ? body.size : undefined, n: body.n === undefined ? undefined : Number(body.n) })
      response.json(data)
    } catch (error) {
      const code = error instanceof Error ? error.message : 'internal'
      const status = code === 'unauthorized' ? 401 : code === 'rate_limit' ? 429 : code.startsWith('invalid') ? 400 : code === 'upstream_rejected' ? 502 : 503
      response.status(status).json({ error: code === 'unauthorized' ? 'invalid_invite_code' : code === 'rate_limit' ? 'rate_limit_exceeded' : code.startsWith('invalid') ? code : 'image_generation_unavailable' })
    }
  })
  return router
}
