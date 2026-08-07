import { Router } from 'express'
import { z } from 'zod'
import type { AuthenticatedRequest } from './authMiddleware.js'

export function createSessionRoutes(service: {
  getHome(userId: string): Promise<unknown>
  updateUsername(userId: string, username: string): Promise<unknown>
}) {
  const router = Router()
  router.get('/', async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await service.getHome(request.userId!)) } catch (error) { next(error) }
  })
  router.patch('/username', async (request: AuthenticatedRequest, response, next) => {
    try {
      const { username } = z.object({ username: z.string().min(3).max(24) }).parse(request.body)
      response.json(await service.updateUsername(request.userId!, username))
    } catch (error) { next(error) }
  })
  return router
}
