import { Router } from 'express'
import { z } from 'zod'
import type { PetAction } from '../domain/models.js'
import type { AuthenticatedRequest } from './authMiddleware.js'

function routeParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

export function createRoomRoutes(dependencies: {
  rooms: ReturnType<typeof import('../services/roomService.js')['createRoomService']>
  pets: ReturnType<typeof import('../services/petService.js')['createPetService']>
  nestTasks?: ReturnType<typeof import('../services/nestTaskService.js')['createNestTaskService']>
  emit: (roomId: string, event: string, payload: unknown) => void
}) {
  const router = Router()
  router.get('/:roomId', async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await dependencies.rooms.bootstrap(routeParam(request.params.roomId), request.userId!)) } catch (error) { next(error) }
  })
  router.get('/:roomId/messages', async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await dependencies.rooms.listMessages(routeParam(request.params.roomId), request.userId!)) } catch (error) { next(error) }
  })
  router.post('/:roomId/messages', async (request: AuthenticatedRequest, response, next) => {
    try {
      const input = z.object({ text: z.string().max(4000), imageUrl: z.url().optional() }).parse(request.body)
      const roomId = routeParam(request.params.roomId)
      const message = await dependencies.rooms.sendMessage(roomId, request.userId!, input)
      dependencies.emit(roomId, 'message.created', message)
      response.status(201).json(message)
    } catch (error) { next(error) }
  })
  router.post('/:roomId/pet-replies', async (request: AuthenticatedRequest, response, next) => {
    try {
      const roomId = routeParam(request.params.roomId)
      const message = await dependencies.rooms.requestPetReply(roomId, request.userId!)
      dependencies.emit(roomId, 'message.created', message)
      response.status(201).json(message)
    } catch (error) { next(error) }
  })
  router.post('/:roomId/pet-actions', async (request: AuthenticatedRequest, response, next) => {
    try {
      const { action } = z.object({ action: z.enum(['feed', 'play', 'clean', 'sleep']) }).parse(request.body)
      const roomId = routeParam(request.params.roomId)
      // 照顾动作是道具的消耗口（睡觉免费）：未接任务服务时保持旧行为
      if (dependencies.nestTasks) await dependencies.nestTasks.consumeForAction(roomId, request.userId!, action)
      const pet = await dependencies.pets.applyAction(roomId, request.userId!, action as PetAction)
      dependencies.emit(roomId, 'pet.updated', pet)
      response.json(pet)
    } catch (error) { next(error) }
  })
  router.get('/:roomId/memories', async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await dependencies.rooms.listMemories(routeParam(request.params.roomId), request.userId!)) } catch (error) { next(error) }
  })
  router.delete('/:roomId/memories/:memoryId', async (request: AuthenticatedRequest, response, next) => {
    try {
      const roomId = routeParam(request.params.roomId)
      const memoryId = routeParam(request.params.memoryId)
      await dependencies.rooms.deleteMemory(roomId, request.userId!, memoryId)
      dependencies.emit(roomId, 'memory.deleted', { id: memoryId })
      response.status(204).end()
    } catch (error) { next(error) }
  })
  return router
}
