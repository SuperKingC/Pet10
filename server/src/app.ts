import cors from 'cors'
import express, { type ErrorRequestHandler } from 'express'
import type { ServerConfig } from './config.js'
import type { RepositoryBundle } from './repositories/contracts.js'
import { createAuthMiddleware } from './http/authMiddleware.js'
import { createAuthRoutes } from './http/authRoutes.js'
import { createFriendshipRoutes } from './http/friendshipRoutes.js'
import { createRoomRoutes } from './http/roomRoutes.js'
import { createSessionRoutes } from './http/sessionRoutes.js'
import { createSocialRoutes } from './http/socialRoutes.js'
import { createUploadRoutes } from './http/uploadRoutes.js'
import { createAuthService } from './services/authService.js'
import { createFriendshipService } from './services/friendshipService.js'
import { createPetBrain } from './services/petBrain.js'
import { createPetService } from './services/petService.js'
import { createPushService, type PushService } from './services/pushService.js'
import { createRoomService } from './services/roomService.js'
import { createSessionService } from './services/sessionService.js'
import { createSocialService } from './services/socialService.js'
import type { AiService } from './services/aiService.js'
import type { createUploadService } from './services/uploadService.js'

export interface AppDependencies {
  config: ServerConfig
  repositories: RepositoryBundle
  ai: AiService
  uploads: ReturnType<typeof createUploadService>
  emit?: (roomId: string, event: string, payload: unknown) => void
  emitUser?: (userId: string, event: string, payload: unknown) => void
}

export function createApp({ config, repositories, ai, uploads, emit = () => undefined, emitUser = () => undefined }: AppDependencies) {
  const app = express()
  app.disable('x-powered-by')
  app.use(cors({ origin: config.appOrigin, credentials: true }))
  app.use(express.json({ limit: '2mb' }))

  app.get('/health', (_request, response) => {
    response.json({
      ok: true,
      service: 'pet10-server',
      aiEnabled: config.ai.enabled
    })
  })

  const authService = createAuthService({
    repositories,
    jwtSecret: config.jwtSecret,
    jwtExpiresIn: config.jwtExpiresIn,
    loginCodeTtlSeconds: config.loginCodeTtlSeconds,
    mailMode: config.mail.mode,
    allowedEmails: config.allowedEmails,
    logCode: (email, code) => console.log(`[login-code] ${email}: ${code}`)
  })
  const brain = createPetBrain({ repositories, ai, emit })
  let pushService: PushService | undefined
  const socialService = createSocialService({
    repositories,
    ai,
    emit,
    emitUser,
    onMoodSet: (roomId, userId, level) => void brain.onMoodSet(roomId, userId, level),
    onNotify: (userId) => void pushService?.notifyUser(userId)
  })
  const friendshipService = createFriendshipService(repositories, {
    notify: (userId, type, payload) => void socialService.notify(userId, type, payload)
  })
  const petService = createPetService(repositories, {
    onPetEvent: (roomId, userId, action, outcome) => void brain.onPetEvent(roomId, userId, action, outcome)
  })
  const roomService = createRoomService({ repositories, ai, brain })
  const sessionService = createSessionService(repositories)
  const authenticate = createAuthMiddleware(config.jwtSecret, config.allowedEmails)
  pushService = createPushService(config.push, repositories)

  app.use('/api/auth', createAuthRoutes(authService))
  app.use('/api/session', authenticate, createSessionRoutes(sessionService))
  app.use('/api/friendships', authenticate, createFriendshipRoutes(friendshipService))
  app.use('/api/social', authenticate, createSocialRoutes({ social: socialService, pets: petService, push: pushService }))
  app.use('/api/rooms', authenticate, createRoomRoutes({
    rooms: roomService,
    pets: petService,
    emit
  }))
  app.use('/api/uploads', authenticate, createUploadRoutes({
    isRoomMember: (roomId, userId) => repositories.rooms.isMember(roomId, userId),
    createImageUpload: (roomId, fileName, contentType, size) =>
      uploads.createImageUpload(roomId, fileName, contentType, size)
  }))

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    console.error(error)
    const message = error instanceof Error ? error.message : 'internal_server_error'
    const status = message.includes('not_found') ? 404 :
      message.includes('forbidden') || message.includes('not_allowed') ? 403 :
      message.includes('unauthorized') ? 401 :
      message.includes('invalid') || message.includes('limit') || message.includes('exists') ? 400 : 500
    response.status(status).json({ error: status === 500 ? 'internal_server_error' : message })
  }
  app.use(errorHandler)
  return app
}
