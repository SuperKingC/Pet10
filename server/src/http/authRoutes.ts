import { Router, type Request } from 'express'
import { z } from 'zod'
import { createLoginRateLimiter } from '../services/loginRateLimiter.js'

function clientIp(request: Request) {
  return request.ip || request.socket.remoteAddress || 'unknown'
}

export function createAuthRoutes(service: {
  loginWithWechat?(code: string, profile: { displayName?: string; avatarUrl?: string }): Promise<unknown>
}, options: { rateLimitPerMinute?: number } = {}) {
  const router = Router()
  const limiter = createLoginRateLimiter({ perMinute: options.rateLimitPerMinute ?? 10 })

  router.post('/wechat', async (request, response, next) => {
    try {
      if (!service.loginWithWechat) throw new Error('wechat_login_not_configured')
      if (!limiter.allow(clientIp(request))) throw new Error('rate_limit_exceeded')
      const input = z.object({
        code: z.string().min(1),
        profile: z.object({
          displayName: z.string().max(40).optional(),
          avatarUrl: avatarUrlSchema.optional()
        }).default({})
      }).parse(request.body)
      response.json(await service.loginWithWechat(input.code, input.profile))
    } catch (error) { next(error) }
  })
  return router
}
const avatarUrlSchema = z.union([
  z.url(),
  z.string().regex(/^data:image\/(?:png|jpeg|webp);base64,/).max(700_000)
])
