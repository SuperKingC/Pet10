import { Router } from 'express'
import { z } from 'zod'

export function createAuthRoutes(service: {
  requestLoginCode(email: string, inviteCode: string): Promise<unknown>
  verifyLoginCode(email: string, code: string): Promise<unknown>
  loginWithWechat?(code: string, profile: { displayName?: string; avatarUrl?: string }): Promise<unknown>
}) {
  const router = Router()
  router.post('/wechat', async (request, response, next) => {
    try {
      if (!service.loginWithWechat) throw new Error('wechat_login_not_configured')
      const input = z.object({
        code: z.string().min(1),
        profile: z.object({
          displayName: z.string().max(40).optional(),
          avatarUrl: z.string().url().optional()
        }).default({})
      }).parse(request.body)
      response.json(await service.loginWithWechat(input.code, input.profile))
    } catch (error) { next(error) }
  })
  router.post('/request-code', async (request, response, next) => {
    try {
      const input = z.object({ email: z.email(), inviteCode: z.string().min(1) }).parse(request.body)
      response.json(await service.requestLoginCode(input.email, input.inviteCode))
    } catch (error) { next(error) }
  })
  router.post('/verify-code', async (request, response, next) => {
    try {
      const input = z.object({ email: z.email(), code: z.string().length(6) }).parse(request.body)
      response.json(await service.verifyLoginCode(input.email, input.code))
    } catch (error) { next(error) }
  })
  return router
}
