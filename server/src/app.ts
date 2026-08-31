import cors from 'cors'
import express, { type ErrorRequestHandler } from 'express'
import type { ServerConfig } from './config.js'
import type { RepositoryBundle } from './repositories/contracts.js'
import { createAuthMiddleware } from './http/authMiddleware.js'
import { resolveErrorResponse } from './http/errorResponse.js'
import { createAuthRoutes } from './http/authRoutes.js'
import { createAccountRoutes } from './http/accountRoutes.js'
import { createFriendshipRoutes } from './http/friendshipRoutes.js'
import { createCoRaiseRoutes } from './http/coRaiseRoutes.js'
import { createGmRoutes } from './http/gmRoutes.js'
import { createInvitationRoutes } from './http/invitationRoutes.js'
import { createRoomRoutes } from './http/roomRoutes.js'
import { createSessionRoutes } from './http/sessionRoutes.js'
import { createSocialRoutes } from './http/socialRoutes.js'
import { createDiaryRoutes } from './http/diaryRoutes.js'
import { createUploadRoutes } from './http/uploadRoutes.js'
import { createImageRoutes } from './http/imageRoutes.js'
import { createAccountService } from './services/accountService.js'
import { createWechatAuthService } from './services/wechatAuthService.js'
import { createFriendshipService } from './services/friendshipService.js'
import { createCoRaiseService } from './services/coRaiseService.js'
import { createGmService } from './services/gmService.js'
import { createInvitationService } from './services/invitationService.js'
import { createPetBrain } from './services/petBrain.js'
import { createPetService } from './services/petService.js'
import { createPushService, type PushService } from './services/pushService.js'
import { createRoomService } from './services/roomService.js'
import { createSessionService } from './services/sessionService.js'
import { createSocialService } from './services/socialService.js'
import { createDiaryService } from './services/diaryService.js'
import type { AiService } from './services/aiService.js'
import type { createUploadService } from './services/uploadService.js'
import { createReminderService } from './services/reminderService.js'
import { createPetMoodService } from './services/petMoodService.js'
import { createPetMoodSweepService } from './services/petMoodSweepService.js'
import { createProactiveSweepService } from './services/proactiveSweepService.js'
import { createNestTaskService } from './services/nestTaskService.js'
import { createNestTaskRoutes } from './http/nestTaskRoutes.js'
import { createPhotoWallService } from './services/photoWallService.js'
import { createPhotoWallRoutes } from './http/photoWallRoutes.js'
import { createWardrobeService } from './services/wardrobeService.js'
import { createWardrobeRoutes } from './http/wardrobeRoutes.js'
import { createGobangRoutes } from './http/gobangRoutes.js'
import type { GobangService } from './services/gobangService.js'

export interface AppDependencies {
  config: ServerConfig
  repositories: RepositoryBundle
  ai: AiService
  uploads: ReturnType<typeof createUploadService>
  emit?: (roomId: string, event: string, payload: unknown) => void
  emitUser?: (userId: string, event: string, payload: unknown) => void
  gobang?: GobangService
}

export function createApp({ config, repositories, ai, uploads, emit = () => undefined, emitUser = () => undefined, gobang }: AppDependencies) {
  const app = express()
  app.disable('x-powered-by')
  app.use(cors({ origin: config.appOrigin, credentials: true }))
  app.use('/api/images', express.json({ limit: '6mb' }), createImageRoutes(config))
  app.use(express.json({ limit: '2mb' }))

  app.get('/health', (_request, response) => {
    response.json({
      ok: true,
      service: 'pet10-server',
      aiEnabled: config.ai.enabled
    })
  })

  const wechatAuthService = config.wechat.enabled
    ? createWechatAuthService({
        repositories,
        jwtSecret: config.jwtSecret,
        jwtExpiresIn: config.jwtExpiresIn,
        exchangeCode: async (code) => {
          const query = new URLSearchParams({
            appid: config.wechat.appId!,
            secret: config.wechat.appSecret!,
            js_code: code,
            grant_type: 'authorization_code'
          })
          const response = await fetch(`https://api.weixin.qq.com/sns/jscode2session?${query}`)
          if (!response.ok) throw new Error('wechat_exchange_failed')
          const result = await response.json() as { openid?: string; unionid?: string; errcode?: number }
          if (!result.openid || result.errcode) throw new Error('wechat_exchange_failed')
          return { openId: result.openid, unionId: result.unionid }
        }
      })
    : undefined
  let pushService: PushService | undefined = createPushService(config.push, repositories)
  const reminders = createReminderService({
    repositories,
    emit,
    emitUser,
    notifyPush: (userId) => pushService?.notifyUser(userId)
  })
  reminders.start()
  const mood = createPetMoodService({ repositories })
  createPetMoodSweepService({ repositories, decayIfIdle: mood.decayIfIdle }).start()
  if (config.proactiveSweepIntervalMs > 0) {
    createProactiveSweepService({ repositories, ai, emit, mood }).start(config.proactiveSweepIntervalMs)
  }
  const brain = createPetBrain({ repositories, ai, emit, reminders, mood })
  const socialService = createSocialService({
    repositories,
    ai,
    emit,
    emitUser,
    onMoodSet: (roomId, userId, level) => void brain.onMoodSet(roomId, userId, level),
    onNotify: (userId) => void pushService?.notifyUser(userId),
    onCodewordBothAnswered: (roomId) => void photoWallService.onCodewordBothAnswered(roomId)
  })
  const friendshipService = createFriendshipService(repositories, {
    notify: (userId, type, payload) => void socialService.notify(userId, type, payload)
  })
  const coRaiseService = createCoRaiseService(repositories, {
    notify: (userId, type, payload) => void socialService.notify(userId, type, payload)
  })
  const diaryService = createDiaryService(repositories)
  const gmService = createGmService(repositories, friendshipService)
  const photoWallService = createPhotoWallService(repositories)
  const invitationService = createInvitationService(repositories)
  const petService = createPetService(repositories, {
    onPetEvent: (roomId, userId, action, outcome) => {
      void brain.onPetEvent(roomId, userId, action, outcome)
      // 升级纪念卡自动入墙（每次升级恰好一张）
      if (outcome.leveledUp) void photoWallService.onLevelUp(roomId, outcome.pet.level)
    }
  })
  const roomService = createRoomService({ repositories, ai, brain })
  const sessionService = createSessionService(repositories, {
    emitUser,
    getInvitation: (token) => invitationService.get(token)
  })
  const nestTaskService = createNestTaskService(repositories, {
    onRewardGranted: (roomId, userId, _taskKey, items) => {
      emit(roomId, 'task.reward', { items })
      // 领奖计数事件：衣柜解锁（背带裤/帽子）等派生条件的数据源
      void (async () => {
        const pet = await repositories.pets.findByRoomId(roomId)
        if (pet) await repositories.petEvents.record(pet.id, userId, 'task_claim')
      })()
    }
  })
  const wardrobeService = createWardrobeService(repositories, {
    onMatchSettled: (event) => {
      void (async () => {
        if (event.matched) {
          await photoWallService.onMatchSettled(event.roomId, { suitKey: event.itemId, day: event.day })
          // 默契达成奖励：香皂×1（与任务道具经济合流）
          await repositories.inventory.add(event.roomId, 'soap', 1)
          for (const participantId of event.participantIds) {
            await nestTaskService.recordOutfitMatch(event.roomId, participantId).catch(() => undefined)
          }
        }
        emit(event.roomId, 'wardrobe.match', {
          matched: event.matched,
          itemId: event.itemId,
          streak: event.streak
        })
      })()
    }
  })
  const authenticate = createAuthMiddleware(config.jwtSecret, config.allowedEmails)
  app.use('/api/auth', createAuthRoutes({
    loginWithWechat: wechatAuthService
      ? (code, profile) => wechatAuthService.login(code, profile)
      : undefined
  }, { rateLimitPerMinute: config.wechat.loginRateLimitPerMinute }))
  app.use('/api/session', authenticate, createSessionRoutes(sessionService))
  app.use('/api/account', authenticate, createAccountRoutes(createAccountService(repositories)))
  app.use('/api/friendships', authenticate, createFriendshipRoutes(friendshipService))
  app.use('/api/co-raise', authenticate, createCoRaiseRoutes(coRaiseService))
  app.use('/api/gm', authenticate, createGmRoutes(gmService))
  app.use('/api/invitations', authenticate, createInvitationRoutes(invitationService))
  app.use('/api/social', authenticate, createSocialRoutes({ social: socialService, pets: petService, push: pushService }))
  app.use('/api/diaries', authenticate, createDiaryRoutes(diaryService))
  app.use('/api', authenticate, createNestTaskRoutes(nestTaskService))
  app.use('/api', authenticate, createPhotoWallRoutes(photoWallService))
  app.use('/api', authenticate, createWardrobeRoutes(wardrobeService))
  app.use('/api/rooms', authenticate, createRoomRoutes({
    rooms: roomService,
    pets: petService,
    nestTasks: nestTaskService,
    emit
  }))
  if (gobang) app.use('/api/games/gobang', authenticate, createGobangRoutes(gobang))
  app.use('/api/uploads', authenticate, createUploadRoutes({
    isRoomMember: (roomId, userId) => repositories.rooms.isMember(roomId, userId),
    createImageUpload: (roomId, fileName, contentType, size) =>
      uploads.createImageUpload(roomId, fileName, contentType, size)
  }))

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    console.error(error)
    const result = resolveErrorResponse(error)
    response.status(result.status).json({ error: result.error })
  }
  app.use(errorHandler)
  return app
}
