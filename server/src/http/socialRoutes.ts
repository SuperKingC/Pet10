import { Router } from 'express'
import { z } from 'zod'
import type { AuthenticatedRequest } from './authMiddleware.js'
import type { SocialService } from '../services/socialService.js'
import type { createPetService } from '../services/petService.js'
import type { PushService } from '../services/pushService.js'

function routeParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

const ANNIVERSARY_ICONS = ['heart', 'star', 'cake', 'paw', 'balloon'] as const
// 纪念日照片背景复用日记照片的 dataURL 上限（photoSchema 300_000 字符）
const anniversaryPhotoSchema = z.string().regex(/^data:image\/(png|jpeg|webp);base64,/).max(300_000)

export function createSocialRoutes(dependencies: {
  social: SocialService
  pets: ReturnType<typeof createPetService>
  push?: PushService
}) {
  const router = Router()

  // 会话列表（小多利私聊懒创建并置顶）
  router.get('/conversations', async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await dependencies.social.listConversations(request.userId!)) } catch (error) { next(error) }
  })

  // 小多利主动说话开关
  router.patch('/rooms/:roomId/proactive', async (request: AuthenticatedRequest, response, next) => {
    try {
      const { enabled } = z.object({ enabled: z.boolean() }).parse(request.body)
      const room = await dependencies.social.setProactive(routeParam(request.params.roomId), request.userId!, enabled)
      response.json(room)
    } catch (error) { next(error) }
  })

  // 双人心情
  router.get('/rooms/:roomId/moods', async (request: AuthenticatedRequest, response, next) => {
    try {
      const roomId = routeParam(request.params.roomId)
      const from = typeof request.query.from === 'string' && request.query.from
        ? request.query.from
        : new Date(new Date().getTime() - 31 * 86400000).toISOString().slice(0, 10)
      const to = typeof request.query.to === 'string' && request.query.to
        ? request.query.to
        : new Date().toISOString().slice(0, 10)
      response.json(await dependencies.social.listMoods(roomId, request.userId!, from, to))
    } catch (error) { next(error) }
  })
  router.put('/rooms/:roomId/moods', async (request: AuthenticatedRequest, response, next) => {
    try {
      const { level } = z.object({ level: z.number().int().min(1).max(4) }).parse(request.body)
      const entry = await dependencies.social.setMood(routeParam(request.params.roomId), request.userId!, level)
      response.json(entry)
    } catch (error) { next(error) }
  })

  // 纪念日
  router.get('/rooms/:roomId/anniversaries', async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await dependencies.social.listAnniversaries(routeParam(request.params.roomId), request.userId!)) } catch (error) { next(error) }
  })
  router.post('/rooms/:roomId/anniversaries', async (request: AuthenticatedRequest, response, next) => {
    try {
      const input = z.object({
        name: z.string().trim().min(1).max(20),
        icon: z.enum(ANNIVERSARY_ICONS),
        note: z.string().max(50).default(''),
        day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        repeatRule: z.enum(['yearly', 'none']).default('yearly'),
        photo: anniversaryPhotoSchema.nullable().optional().default(null)
      }).parse(request.body)
      const anniversary = await dependencies.social.createAnniversary(routeParam(request.params.roomId), request.userId!, input)
      response.status(201).json(anniversary)
    } catch (error) { next(error) }
  })
  router.put('/rooms/:roomId/anniversaries/:anniversaryId', async (request: AuthenticatedRequest, response, next) => {
    try {
      const patch = z.object({
        name: z.string().trim().min(1).max(20),
        icon: z.enum(ANNIVERSARY_ICONS),
        note: z.string().max(50),
        repeatRule: z.enum(['yearly', 'none']),
        photo: anniversaryPhotoSchema.nullable()
      }).partial().parse(request.body)
      const anniversary = await dependencies.social.updateAnniversary(routeParam(request.params.roomId), request.userId!, routeParam(request.params.anniversaryId), patch)
      response.json(anniversary)
    } catch (error) { next(error) }
  })
  router.delete('/rooms/:roomId/anniversaries/:anniversaryId', async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await dependencies.social.deleteAnniversary(routeParam(request.params.roomId), request.userId!, routeParam(request.params.anniversaryId))) } catch (error) { next(error) }
  })

  // 小多利圈（跨房间动态流）
  router.get('/circle', async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await dependencies.social.listCircleFeed(request.userId!)) } catch (error) { next(error) }
  })

  // 小多利圈（动态）
  router.get('/rooms/:roomId/posts', async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await dependencies.social.listPosts(routeParam(request.params.roomId), request.userId!)) } catch (error) { next(error) }
  })
  router.post('/rooms/:roomId/posts', async (request: AuthenticatedRequest, response, next) => {
    try {
      const input = z.object({ text: z.string().max(500).default(''), imageUrl: z.url().optional() }).parse(request.body)
      const post = await dependencies.social.createPost(routeParam(request.params.roomId), request.userId!, input)
      response.status(201).json(post)
    } catch (error) { next(error) }
  })
  router.post('/posts/:postId/like', async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await dependencies.social.toggleLike(routeParam(request.params.postId), request.userId!, true)) } catch (error) { next(error) }
  })
  router.delete('/posts/:postId/like', async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await dependencies.social.toggleLike(routeParam(request.params.postId), request.userId!, false)) } catch (error) { next(error) }
  })

  // 通知中心
  router.get('/notifications', async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await dependencies.social.listNotifications(request.userId!)) } catch (error) { next(error) }
  })
  router.post('/notifications/read-all', async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await dependencies.social.markAllNotificationsRead(request.userId!)) } catch (error) { next(error) }
  })

  // 今日个人运势
  router.get('/fortune/today', async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await dependencies.social.getTodayFortune(request.userId!)) } catch (error) { next(error) }
  })

  // 每日暗号
  router.get('/rooms/:roomId/codeword', async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await dependencies.social.getCodeword(routeParam(request.params.roomId), request.userId!)) } catch (error) { next(error) }
  })
  router.put('/rooms/:roomId/codeword', async (request: AuthenticatedRequest, response, next) => {
    try {
      const { answer } = z.object({ answer: z.string().min(1).max(200) }).parse(request.body)
      response.json(await dependencies.social.answerCodeword(routeParam(request.params.roomId), request.userId!, answer))
    } catch (error) { next(error) }
  })

  // 双方贡献榜
  router.get('/rooms/:roomId/contributions', async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await dependencies.pets.contributions(routeParam(request.params.roomId), request.userId!)) } catch (error) { next(error) }
  })

  // 足迹地图
  router.get('/rooms/:roomId/map', async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await dependencies.social.listMapLights(routeParam(request.params.roomId), request.userId!)) } catch (error) { next(error) }
  })
  router.post('/rooms/:roomId/map', async (request: AuthenticatedRequest, response, next) => {
    try {
      const { spotId } = z.object({ spotId: z.number().int().min(1).max(16) }).parse(request.body)
      const light = await dependencies.social.lightMapSpot(routeParam(request.params.roomId), request.userId!, spotId)
      response.status(201).json(light)
    } catch (error) { next(error) }
  })

  // Web Push 订阅
  router.get('/push/vapid-public-key', (_request: AuthenticatedRequest, response) => {
    response.json({ enabled: Boolean(dependencies.push?.enabled), publicKey: dependencies.push?.publicKey ?? '' })
  })
  router.post('/push/subscribe', async (request: AuthenticatedRequest, response, next) => {
    try {
      if (!dependencies.push) throw new Error('push_not_enabled')
      const subscription = z.object({
        endpoint: z.string().min(1),
        keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) })
      }).parse(request.body)
      await dependencies.push.subscribe(request.userId!, subscription)
      response.status(201).json({ ok: true })
    } catch (error) { next(error) }
  })
  router.delete('/push/subscribe', async (request: AuthenticatedRequest, response, next) => {
    try {
      if (!dependencies.push) throw new Error('push_not_enabled')
      const { endpoint } = z.object({ endpoint: z.string().min(1) }).parse(request.body)
      await dependencies.push.unsubscribe(request.userId!, endpoint)
      response.json({ ok: true })
    } catch (error) { next(error) }
  })

  return router
}
