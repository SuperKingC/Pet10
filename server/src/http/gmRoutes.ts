import { Router } from 'express'
import { z } from 'zod'
import type { AuthenticatedRequest } from './authMiddleware.js'

const addFriendsSchema = z.object({ count: z.number().int().min(1).max(10) })
const unlockAllSchema = z.object({ enabled: z.boolean() })

export function createGmRoutes(service: {
  addFriends(userId: string, count: number): Promise<unknown>
  removeFriends(userId: string): Promise<unknown>
  addNestItems(userId: string): Promise<unknown>
  setWardrobeUnlockAll(userId: string, enabled: boolean): Promise<unknown>
}) {
  const router = Router()
  router.post('/friends', async (request: AuthenticatedRequest, response, next) => {
    try {
      const parsed = addFriendsSchema.safeParse(request.body)
      if (!parsed.success) throw new Error('invalid_count')
      response.status(201).json(await service.addFriends(request.userId!, parsed.data.count))
    } catch (error) { next(error) }
  })
  router.delete('/friends', async (request: AuthenticatedRequest, response, next) => {
    try {
      response.json(await service.removeFriends(request.userId!))
    } catch (error) { next(error) }
  })
  // GM：当前账号全部小窝每件照顾道具 +9
  router.post('/nest/items', async (request: AuthenticatedRequest, response, next) => {
    try {
      response.status(201).json(await service.addNestItems(request.userId!))
    } catch (error) { next(error) }
  })
  // GM：衣柜全解锁开关（enabled=false 恢复按条件解锁）
  router.post('/wardrobe/unlock-all', async (request: AuthenticatedRequest, response, next) => {
    try {
      const parsed = unlockAllSchema.safeParse(request.body)
      if (!parsed.success) throw new Error('invalid_enabled')
      response.json(await service.setWardrobeUnlockAll(request.userId!, parsed.data.enabled))
    } catch (error) { next(error) }
  })
  return router
}
