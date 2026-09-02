import { Router } from 'express'
import { z } from 'zod'
import type { AuthenticatedRequest } from './authMiddleware.js'
import type { createNestTaskService } from '../services/nestTaskService.js'

function routeParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

export function createNestTaskRoutes(service: ReturnType<typeof createNestTaskService>) {
  const router = Router()

  // 系统预设任务列表（含实时进度）
  router.get('/rooms/:roomId/tasks', async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await service.list(routeParam(request.params.roomId), request.userId!)) } catch (error) { next(error) }
  })
  // 道具库存
  router.get('/rooms/:roomId/inventory', async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await service.inventory(routeParam(request.params.roomId), request.userId!)) } catch (error) { next(error) }
  })
  // 领取任务奖励
  router.post('/rooms/:roomId/tasks/:taskKey/claim', async (request: AuthenticatedRequest, response, next) => {
    try {
      const { taskKey } = z.object({ taskKey: z.string().min(1).max(60) }).parse({ taskKey: routeParam(request.params.taskKey) })
      response.json(await service.claim(routeParam(request.params.roomId), request.userId!, taskKey))
    } catch (error) { next(error) }
  })
  // 每日签到
  router.post('/rooms/:roomId/checkin', async (request: AuthenticatedRequest, response, next) => {
    try {
      response.json(await service.checkin(routeParam(request.params.roomId), request.userId!))
    } catch (error) { next(error) }
  })
  // 行为上报：五子棋完局（小多利/好友）、塔罗解读、写日记、设纪念日、设置姓名和头像
  router.post('/rooms/:roomId/activities', async (request: AuthenticatedRequest, response, next) => {
    try {
      const { metric } = z.object({ metric: z.enum(['gobang_pet', 'gobang_friend', 'tarot', 'profile', 'diary', 'anniversary']) }).parse(request.body)
      await service.recordActivity(routeParam(request.params.roomId), request.userId!, metric)
      response.status(201).json({ ok: true })
    } catch (error) { next(error) }
  })

  return router
}
