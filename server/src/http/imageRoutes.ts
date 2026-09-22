import { Router } from 'express'
import type { ServerConfig } from '../config.js'
import { createImageGenerationService, ImageGenerationError } from '../services/imageGenerationService.js'
import { createImageRateLimiter } from '../services/imageRateLimiter.js'
import { createImageTaskService } from '../services/imageTaskService.js'

function bearerCode(header: string | undefined): string {
  return header?.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : ''
}

function respondImageError(error: unknown, response: import('express').Response, durationMs: number) {
  const code = error instanceof Error ? error.message : 'internal'
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

export function createImageRoutes(config: Pick<ServerConfig, 'image'>, fetcher: typeof fetch = fetch) {
  const router = Router()
  // 同步接口与任务共用同一限流额度池，避免通过任务接口绕过限额
  const limiter = createImageRateLimiter({ perMinute: config.image.rateLimitPerMinute, perDay: config.image.dailyLimit })
  const service = createImageGenerationService(config.image, fetcher, limiter)
  const tasks = createImageTaskService({ generation: service, limiter, maxPromptLength: config.image.maxPromptLength })

  // 模型目录：只含启用模型的 id/kind/label，无任何密钥，公开可读
  router.get('/models', (_request, response) => {
    response.json({ models: service.listModels() })
  })

  router.post('/generations', async (request, response) => {
    const startedAt = performance.now()
    const body = request.body as Record<string, unknown>
    try {
      const data = await service.generate({ inviteCode: bearerCode(request.header('authorization')), ip: request.ip || request.socket.remoteAddress || 'unknown', prompt: typeof body.prompt === 'string' ? body.prompt : '', model: typeof body.model === 'string' ? body.model : undefined, size: typeof body.size === 'string' ? body.size : undefined, n: body.n === undefined ? undefined : Number(body.n), referenceImages: Array.isArray(body.referenceImages) && body.referenceImages.every(image => typeof image === 'string') ? body.referenceImages : body.referenceImages === undefined ? undefined : [''] })
      response.json({ ...data, durationMs: Math.round(performance.now() - startedAt) })
    } catch (error) {
      respondImageError(error, response, Math.round(performance.now() - startedAt))
    }
  })

  router.post('/tasks', (request, response) => {
    const startedAt = performance.now()
    const body = request.body as Record<string, unknown>
    try {
      const snapshot = tasks.submit({
        inviteCode: bearerCode(request.header('authorization')),
        ip: request.ip || request.socket.remoteAddress || 'unknown',
        prompt: typeof body.prompt === 'string' ? body.prompt : '',
        model: typeof body.model === 'string' ? body.model : undefined,
        size: typeof body.size === 'string' ? body.size : undefined,
        seconds: body.seconds === undefined ? undefined : Number(body.seconds),
        referenceImages: Array.isArray(body.referenceImages) && body.referenceImages.every(image => typeof image === 'string') ? body.referenceImages : body.referenceImages === undefined ? undefined : ['']
      })
      response.status(202).json(snapshot)
    } catch (error) {
      respondImageError(error, response, Math.round(performance.now() - startedAt))
    }
  })

  router.get('/tasks/:id', (request, response) => {
    try {
      const snapshot = tasks.get(String(request.params.id ?? ''), bearerCode(request.header('authorization')))
      if (!snapshot) {
        response.status(404).json({ error: 'task_not_found' })
        return
      }
      response.json(snapshot)
    } catch (error) {
      respondImageError(error, response, 0)
    }
  })

  return router
}
