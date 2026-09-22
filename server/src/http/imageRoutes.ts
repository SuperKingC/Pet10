import { Router } from 'express'
import type { ServerConfig } from '../config.js'
import { createImageGenerationService, ImageGenerationError } from '../services/imageGenerationService.js'
import { createImagePromptOptimizer } from '../services/imagePromptOptimizer.js'
import { createImageRateLimiter, createInviteFailureLimiter } from '../services/imageRateLimiter.js'
import { createImageTaskService } from '../services/imageTaskService.js'

function bearerCode(header: string | undefined): string {
  return header?.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : ''
}

function respondImageError(error: unknown, response: import('express').Response, durationMs: number, extra?: Record<string, unknown>) {
  const code = error instanceof Error ? error.message : 'internal'
  const upstreamCode = error instanceof ImageGenerationError ? error.upstreamCode : undefined
  const requestId = error instanceof ImageGenerationError ? error.requestId : undefined
  const status = code === 'unauthorized' ? 401 : code === 'invite_locked' ? 403 : code === 'rate_limit' ? 429 : code.startsWith('invalid') && code !== 'upstream_invalid_response' ? 400 : code === 'upstream_rejected' ? 502 : 503
  const publicError = code === 'unauthorized' ? 'invalid_invite_code' : code === 'invite_locked' ? 'invite_locked' : code === 'rate_limit' ? 'rate_limit_exceeded' : code.startsWith('invalid') && code !== 'upstream_invalid_response' ? code : 'image_generation_unavailable'
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
    ...(requestId === undefined ? {} : { requestId }),
    ...extra
  })
}

export function createImageRoutes(config: Pick<ServerConfig, 'image'>, fetcher: typeof fetch = fetch) {
  const router = Router()
  // 分钟池（图/视频共享）；日额度图/视频分池按张/个计；邀请码错误走独立失败锁定
  const minuteLimiter = createImageRateLimiter({ perMinute: config.image.rateLimitPerMinute, perDay: 1_000_000 })
  const imageDailyLimiter = createImageRateLimiter({ perMinute: 1_000_000, perDay: config.image.imageDailyLimit })
  const videoDailyLimiter = createImageRateLimiter({ perMinute: 1_000_000, perDay: config.image.videoDailyLimit })
  const failureLimiter = createInviteFailureLimiter({ maxPerDay: config.image.inviteMaxFailuresPerDay })
  const service = createImageGenerationService(config.image, fetcher, { minute: minuteLimiter, imageDaily: imageDailyLimiter })
  const tasks = createImageTaskService({ generation: service, minuteLimiter, imageDailyLimiter, videoDailyLimiter, failureLimiter, maxPromptLength: config.image.maxPromptLength })
  // 提示词优化是廉价文本调用，独立于生图额度的宽松限额
  const optimizeLimiter = createImageRateLimiter({ perMinute: 6, perDay: 30 })
  const optimizer = createImagePromptOptimizer(config.image, fetcher)

  function guard(error: unknown, response: import('express').Response, durationMs: number, ip?: string, recordFailure = false) {
    const code = error instanceof Error ? error.message : 'internal'
    if (recordFailure && code === 'unauthorized' && ip) failureLimiter.recordFailure(ip)
    const extra = code === 'unauthorized' && ip ? { attemptsRemaining: failureLimiter.remaining(ip) } : undefined
    respondImageError(error, response, durationMs, extra)
  }

  function clientIp(request: import('express').Request): string {
    return request.ip || request.socket.remoteAddress || 'unknown'
  }

  // 模型目录：只含启用模型的 id/kind/label，无任何密钥，公开可读
  router.get('/models', (_request, response) => {
    response.json({ models: service.listModels() })
  })

  // 剩余额度（图/视频分池）+ 邀请码门禁校验：本接口即门禁页的验证入口
  router.get('/quota', (request, response) => {
    const ip = clientIp(request)
    try {
      if (failureLimiter.isLocked(ip)) throw new Error('invite_locked')
      try {
        service.authorize(bearerCode(request.header('authorization')))
      } catch (error) {
        failureLimiter.recordFailure(ip)
        throw error
      }
      const minuteRemaining = minuteLimiter.peek(ip).minuteRemaining
      response.json({
        perMinuteLimit: config.image.rateLimitPerMinute,
        imageDailyLimit: config.image.imageDailyLimit,
        videoDailyLimit: config.image.videoDailyLimit,
        minuteRemaining,
        imageRemaining: imageDailyLimiter.peek(ip).dayRemaining,
        videoRemaining: videoDailyLimiter.peek(ip).dayRemaining,
        attemptsRemaining: failureLimiter.remaining(ip)
      })
    } catch (error) {
      guard(error, response, 0, ip)
    }
  })

  // 提示词优化：锁定→鉴权（错码计失败）→独立宽松限额
  router.post('/optimize', async (request, response) => {
    const startedAt = performance.now()
    const ip = clientIp(request)
    const body = request.body as Record<string, unknown>
    try {
      if (failureLimiter.isLocked(ip)) throw new Error('invite_locked')
      try {
        service.authorize(bearerCode(request.header('authorization')))
      } catch (error) {
        failureLimiter.recordFailure(ip)
        throw error
      }
      if (!optimizeLimiter.allow(ip)) throw new Error('rate_limit')
      const prompt = typeof body.prompt === 'string' ? body.prompt : ''
      const kind = body.kind === 'video' ? 'video' : 'image'
      const optimized = await optimizer({ prompt, kind, hasFirstFrame: body.hasFirstFrame === true })
      response.json({ prompt: optimized, durationMs: Math.round(performance.now() - startedAt) })
    } catch (error) {
      guard(error, response, Math.round(performance.now() - startedAt), ip)
    }
  })

  router.post('/generations', async (request, response) => {
    const startedAt = performance.now()
    const ip = clientIp(request)
    const body = request.body as Record<string, unknown>
    try {
      if (failureLimiter.isLocked(ip)) throw new Error('invite_locked')
      const data = await service.generate({ inviteCode: bearerCode(request.header('authorization')), ip, prompt: typeof body.prompt === 'string' ? body.prompt : '', model: typeof body.model === 'string' ? body.model : undefined, size: typeof body.size === 'string' ? body.size : undefined, n: body.n === undefined ? undefined : Number(body.n), referenceImages: Array.isArray(body.referenceImages) && body.referenceImages.every(image => typeof image === 'string') ? body.referenceImages : body.referenceImages === undefined ? undefined : [''] })
      response.json({ ...data, durationMs: Math.round(performance.now() - startedAt) })
    } catch (error) {
      guard(error, response, Math.round(performance.now() - startedAt), ip, true)
    }
  })

  router.post('/tasks', (request, response) => {
    const startedAt = performance.now()
    const ip = clientIp(request)
    const body = request.body as Record<string, unknown>
    try {
      const snapshot = tasks.submit({
        inviteCode: bearerCode(request.header('authorization')),
        ip,
        prompt: typeof body.prompt === 'string' ? body.prompt : '',
        model: typeof body.model === 'string' ? body.model : undefined,
        aspectRatio: typeof body.aspectRatio === 'string' ? body.aspectRatio : undefined,
        imageSize: typeof body.imageSize === 'string' ? body.imageSize : undefined,
        count: body.count === undefined ? undefined : Number(body.count),
        resolution: typeof body.resolution === 'string' ? body.resolution : undefined,
        duration: body.duration === undefined ? undefined : Number(body.duration),
        audio: body.audio === undefined ? undefined : body.audio === true,
        referenceImages: Array.isArray(body.referenceImages) && body.referenceImages.every(image => typeof image === 'string') ? body.referenceImages : body.referenceImages === undefined ? undefined : ['']
      })
      response.status(202).json(snapshot)
    } catch (error) {
      // 任务服务内部已对错码计失败，这里只补 attemptsRemaining
      guard(error, response, Math.round(performance.now() - startedAt), ip)
    }
  })

  router.get('/tasks/:id', (request, response) => {
    const ip = clientIp(request)
    try {
      const snapshot = tasks.get(String(request.params.id ?? ''), bearerCode(request.header('authorization')), ip)
      if (!snapshot) {
        response.status(404).json({ error: 'task_not_found' })
        return
      }
      response.json(snapshot)
    } catch (error) {
      guard(error, response, 0, ip, true)
    }
  })

  return router
}
