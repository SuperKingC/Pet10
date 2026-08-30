import { Router } from 'express'
import type { AuthenticatedRequest } from './authMiddleware.js'
import type { createCoRaiseService } from '../services/coRaiseService.js'

function routeParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

type CoRaiseService = ReturnType<typeof createCoRaiseService>

export function createCoRaiseRoutes(service: CoRaiseService) {
  const router = Router()
  // 可一起养小多利的好友列表（选择弹窗数据源）
  router.get('/candidates', async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await service.listCandidates(request.userId!)) } catch (error) { next(error) }
  })
  // 发出合养邀请（好友在小窝收到提示）
  router.post('/relationships/:relationshipId/invite', async (request: AuthenticatedRequest, response, next) => {
    try {
      response.json(await service.invite(request.userId!, routeParam(request.params.relationshipId)))
    } catch (error) { next(error) }
  })
  // 确认合养：创建唯一的小多利并进入共养小窝
  router.post('/relationships/:relationshipId/confirm', async (request: AuthenticatedRequest, response, next) => {
    try {
      response.json(await service.confirm(request.userId!, routeParam(request.params.relationshipId)))
    } catch (error) { next(error) }
  })
  return router
}
