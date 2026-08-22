import { Router } from 'express'
import type { AuthenticatedRequest } from './authMiddleware.js'

export function createAccountRoutes(service: {
  deactivate(userId: string): Promise<unknown>
}) {
  const router = Router()
  router.post('/deactivate', async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await service.deactivate(request.userId!)) } catch (error) { next(error) }
  })
  return router
}
