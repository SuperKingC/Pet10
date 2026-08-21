import { Router } from 'express'
import { z } from 'zod'
import type { GobangService } from '../services/gobangService.js'
import type { AuthenticatedRequest } from './authMiddleware.js'

function routeParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

export function createGobangRoutes(gobang: GobangService) {
  const router = Router()

  router.get('/state', (request: AuthenticatedRequest, response) => {
    response.json({
      game: gobang.sync(request.userId!),
      invitations: gobang.pending(request.userId!),
    })
  })

  router.post('/invitations', async (request: AuthenticatedRequest, response, next) => {
    try {
      const input = z.object({ toUserId: z.string().min(1), roomId: z.string().min(1) }).parse(request.body)
      response.status(201).json(await gobang.invite(request.userId!, input.toUserId, input.roomId))
    } catch (error) { next(error) }
  })

  router.post('/invitations/:inviteId/accept', async (request: AuthenticatedRequest, response, next) => {
    try {
      response.json(await gobang.accept(request.userId!, routeParam(request.params.inviteId)))
    } catch (error) { next(error) }
  })

  router.post('/invitations/:inviteId/decline', (request: AuthenticatedRequest, response, next) => {
    try {
      gobang.decline(request.userId!, routeParam(request.params.inviteId))
      response.json({ ok: true })
    } catch (error) { next(error) }
  })

  router.post('/games/:gameId/moves', async (request: AuthenticatedRequest, response, next) => {
    try {
      const input = z.object({ x: z.number().int().min(0).max(14), y: z.number().int().min(0).max(14) }).parse(request.body)
      response.json(await gobang.move(request.userId!, routeParam(request.params.gameId), input.x, input.y))
    } catch (error) { next(error) }
  })

  router.post('/games/:gameId/resign', async (request: AuthenticatedRequest, response, next) => {
    try {
      await gobang.resign(request.userId!, routeParam(request.params.gameId))
      response.json({ ok: true })
    } catch (error) { next(error) }
  })

  return router
}
