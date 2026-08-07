import { Router } from 'express'
import { z } from 'zod'

export function createAuthRoutes(service: {
  requestLoginCode(email: string, inviteCode: string): Promise<unknown>
  verifyLoginCode(email: string, code: string): Promise<unknown>
}) {
  const router = Router()
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
