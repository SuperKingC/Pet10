import { Router } from 'express'
import { z } from 'zod'
import type { AuthenticatedRequest } from './authMiddleware.js'
import type { createNestTaskService } from '../services/nestTaskService.js'

function routeParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

const TASK_ICONS = ['paw', 'bone', 'bath', 'walk', 'star'] as const

const rewardItemSchema = z.object({
  itemId: z.string().min(1).max(40),
  count: z.number().int().min(1).max(7)
})

const taskInputSchema = z.object({
  title: z.string().trim().min(1).max(20),
  icon: z.enum(TASK_ICONS).optional(),
  repeatRule: z.enum(['daily', 'weekly', 'none']).default('daily'),
  rewardItems: z.array(rewardItemSchema).max(3).default([]),
  rewardExp: z.number().int().min(0).max(60).default(10)
})

const taskPatchSchema = taskInputSchema.partial().extend({
  archived: z.boolean().optional()
})

export function createNestTaskRoutes(service: ReturnType<typeof createNestTaskService>) {
  const router = Router()

  router.get('/rooms/:roomId/tasks', async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await service.list(routeParam(request.params.roomId), request.userId!)) } catch (error) { next(error) }
  })
  router.get('/rooms/:roomId/inventory', async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await service.inventory(routeParam(request.params.roomId), request.userId!)) } catch (error) { next(error) }
  })
  router.post('/rooms/:roomId/tasks', async (request: AuthenticatedRequest, response, next) => {
    try {
      const input = taskInputSchema.parse(request.body)
      const task = await service.create(routeParam(request.params.roomId), request.userId!, input)
      response.status(201).json(task)
    } catch (error) { next(error) }
  })
  router.patch('/rooms/:roomId/tasks/:taskId', async (request: AuthenticatedRequest, response, next) => {
    try {
      const patch = taskPatchSchema.parse(request.body)
      const task = await service.update(routeParam(request.params.roomId), request.userId!, routeParam(request.params.taskId), patch)
      response.json(task)
    } catch (error) { next(error) }
  })
  router.post('/rooms/:roomId/tasks/:taskId/complete', async (request: AuthenticatedRequest, response, next) => {
    try {
      const result = await service.complete(routeParam(request.params.roomId), request.userId!, routeParam(request.params.taskId))
      response.json(result)
    } catch (error) { next(error) }
  })

  return router
}
