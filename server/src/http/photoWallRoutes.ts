import { Router } from 'express'
import { z } from 'zod'
import type { AuthenticatedRequest } from './authMiddleware.js'
import type { createPhotoWallService } from '../services/photoWallService.js'

function routeParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

// 与日记照片同一 dataURL 上限（300_000 字符）
const photoSchema = z.string().regex(/^data:image\/(png|jpeg|webp);base64,/).max(300_000)

const createPhotoSchema = z.object({
  photo: photoSchema,
  caption: z.string().max(40).default(''),
  takenDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
})

export function createPhotoWallRoutes(service: ReturnType<typeof createPhotoWallService>) {
  const router = Router()

  router.get('/rooms/:roomId/photos', async (request: AuthenticatedRequest, response, next) => {
    try { response.json({ photos: await service.list(routeParam(request.params.roomId), request.userId!) }) } catch (error) { next(error) }
  })

  router.post('/rooms/:roomId/photos', async (request: AuthenticatedRequest, response, next) => {
    try {
      const input = createPhotoSchema.parse(request.body)
      response.status(201).json(await service.create(routeParam(request.params.roomId), request.userId!, input))
    } catch (error) { next(error) }
  })

  router.patch('/rooms/:roomId/photos/:photoId', async (request: AuthenticatedRequest, response, next) => {
    try {
      const { caption } = z.object({ caption: z.string().max(40) }).parse(request.body)
      response.json(await service.updateCaption(routeParam(request.params.roomId), request.userId!, routeParam(request.params.photoId), caption))
    } catch (error) { next(error) }
  })

  router.delete('/rooms/:roomId/photos/:photoId', async (request: AuthenticatedRequest, response, next) => {
    try {
      await service.remove(routeParam(request.params.roomId), request.userId!, routeParam(request.params.photoId))
      response.json({ ok: true })
    } catch (error) { next(error) }
  })

  return router
}
