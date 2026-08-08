import { Router } from 'express'
import { z } from 'zod'
import type { UserProfilePatch } from '../repositories/contracts.js'
import type { AuthenticatedRequest } from './authMiddleware.js'

export function createSessionRoutes(service: {
  getHome(userId: string): Promise<unknown>
  updateUsername(userId: string, username: string): Promise<unknown>
  updateProfile(userId: string, patch: UserProfilePatch): Promise<unknown>
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
  router.patch('/profile', async (request: AuthenticatedRequest, response, next) => {
    try {
      const patch = z.object({
        avatarUrl: z.url().nullable().optional(),
        avatarConfig: z.string().max(2000).nullable().optional(),
        displayName: z.string().max(30).nullable().optional(),
        birthday: z.string().max(30).nullable().optional(),
        mbti: z.string().max(4).nullable().optional()
      }).parse(request.body)
      response.json(await service.updateProfile(request.userId!, patch))
    } catch (error) { next(error) }
  })
  return router
}
