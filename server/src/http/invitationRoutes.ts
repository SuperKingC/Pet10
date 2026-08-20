import { Router } from 'express'
import type { AuthenticatedRequest } from './authMiddleware.js'

function routeParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

export function createInvitationRoutes(service: {
  create(userId: string): Promise<unknown>
  get(token: string): Promise<unknown>
  accept(token: string, userId: string): Promise<unknown>
  decline(token: string, userId: string): Promise<unknown>
}) {
  const router = Router()
  router.post('/', async (request: AuthenticatedRequest, response, next) => {
    try {
      response.status(201).json(await service.create(request.userId!))
    } catch (error) { next(error) }
  })
  router.get('/:token', async (request, response, next) => {
    try {
      response.json(await service.get(routeParam(request.params.token)))
    } catch (error) { next(error) }
  })
  router.post('/:token/accept', async (request: AuthenticatedRequest, response, next) => {
    try {
      response.json(await service.accept(routeParam(request.params.token), request.userId!))
    } catch (error) { next(error) }
  })
  router.post('/:token/decline', async (request: AuthenticatedRequest, response, next) => {
    try {
      response.json(await service.decline(routeParam(request.params.token), request.userId!))
    } catch (error) { next(error) }
  })
  return router
}
