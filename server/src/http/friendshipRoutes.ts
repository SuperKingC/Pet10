import { Router } from 'express'
import { z } from 'zod'
import type { AuthenticatedRequest } from './authMiddleware.js'

function routeParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

export function createFriendshipRoutes(service: {
  sendRequest(userId: string, identifier: string): Promise<unknown>
  acceptRequest(userId: string, relationshipId: string): Promise<unknown>
  lookupUser(userId: string, identifier: string): Promise<unknown>
  listSuggestions(userId: string): Promise<unknown>
}) {
  const router = Router()
  router.post('/', async (request: AuthenticatedRequest, response, next) => {
    try {
      const { identifier } = z.object({ identifier: z.string().min(1) }).parse(request.body)
      response.status(201).json(await service.sendRequest(request.userId!, identifier))
    } catch (error) { next(error) }
  })
  router.get('/suggestions', async (request: AuthenticatedRequest, response, next) => {
    try {
      response.json(await service.listSuggestions(request.userId!))
    } catch (error) { next(error) }
  })
  router.get('/lookup', async (request: AuthenticatedRequest, response, next) => {
    try {
      const { identifier } = z.object({ identifier: z.string().min(1) }).parse(request.query)
      response.json(await service.lookupUser(request.userId!, identifier))
    } catch (error) { next(error) }
  })
  router.post('/:id/accept', async (request: AuthenticatedRequest, response, next) => {
    try {
      response.json(await service.acceptRequest(request.userId!, routeParam(request.params.id)))
    } catch (error) { next(error) }
  })
  return router
}
