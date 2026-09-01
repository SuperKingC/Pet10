import { Router } from 'express'
import { z } from 'zod'
import type { AuthenticatedRequest } from './authMiddleware.js'
import type { createWardrobeService } from '../services/wardrobeService.js'

function routeParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

const suitKeySchema = z.object({ itemKey: z.string().min(1).max(30) })

const outfitSchema = z.object({
  body: z.string().max(30).optional(),
  hat: z.string().max(30).nullable().optional(),
  scarf: z.string().max(30).nullable().optional(),
  bag: z.string().max(30).nullable().optional()
})

const wardrobeSaveSchema = z.union([
  suitKeySchema,
  z.object({ outfit: outfitSchema })
])

export function createWardrobeRoutes(service: ReturnType<typeof createWardrobeService>) {
  const router = Router()

  // 目录 + 解锁 + 今日默契状态（GET 时顺带幂等结算当日默契）
  router.get('/rooms/:roomId/wardrobe', async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await service.get(routeParam(request.params.roomId), request.userId!)) } catch (error) { next(error) }
  })

  router.put('/rooms/:roomId/wardrobe', async (request: AuthenticatedRequest, response, next) => {
    try {
      const payload = wardrobeSaveSchema.parse(request.body)
      response.json(await service.setEquipped(routeParam(request.params.roomId), request.userId!, payload))
    } catch (error) { next(error) }
  })

  // 提交今日默契换装选择（即当日「换装」动作）
  router.post('/rooms/:roomId/wardrobe/match', async (request: AuthenticatedRequest, response, next) => {
    try {
      const { itemKey } = suitKeySchema.parse(request.body)
      response.json(await service.submitMatchPick(routeParam(request.params.roomId), request.userId!, itemKey))
    } catch (error) { next(error) }
  })

  return router
}
