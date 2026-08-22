import { Router } from 'express'
import { z } from 'zod'
import type { AuthenticatedRequest } from './authMiddleware.js'

const addFriendsSchema = z.object({ count: z.number().int().min(1).max(10) })

export function createGmRoutes(service: {
  addFriends(userId: string, count: number): Promise<unknown>
}) {
  const router = Router()
  router.post('/friends', async (request: AuthenticatedRequest, response, next) => {
    try {
      const parsed = addFriendsSchema.safeParse(request.body)
      if (!parsed.success) throw new Error('invalid_count')
      response.status(201).json(await service.addFriends(request.userId!, parsed.data.count))
    } catch (error) { next(error) }
  })
  return router
}
