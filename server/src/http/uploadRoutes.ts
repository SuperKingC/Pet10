import { Router } from 'express'
import { z } from 'zod'
import type { AuthenticatedRequest } from './authMiddleware.js'

function routeParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

export function createUploadRoutes(dependencies: {
  isRoomMember(roomId: string, userId: string): Promise<boolean>
  createImageUpload(roomId: string, fileName: string, contentType: string, size: number): Promise<unknown>
}) {
  const router = Router()
  router.post('/:roomId/image', async (request: AuthenticatedRequest, response, next) => {
    try {
      const roomId = routeParam(request.params.roomId)
      if (!(await dependencies.isRoomMember(roomId, request.userId!))) throw new Error('room_forbidden')
      const input = z.object({
        fileName: z.string().min(1).max(200),
        contentType: z.string().min(1),
        size: z.number().int().positive()
      }).parse(request.body)
      response.json(await dependencies.createImageUpload(roomId, input.fileName, input.contentType, input.size))
    } catch (error) { next(error) }
  })
  return router
}
