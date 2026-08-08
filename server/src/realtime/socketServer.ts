import type { Server as HttpServer } from 'node:http'
import jwt from 'jsonwebtoken'
import { Server, type Socket } from 'socket.io'
import type { RepositoryBundle } from '../repositories/contracts.js'

export function createSocketServer(
  httpServer: HttpServer,
  appOrigin: string,
  jwtSecret: string,
  allowedEmails: string[] = [],
  repositories?: RepositoryBundle,
  onConnect?: (socket: Socket, userId: string) => void
) {
  const io = new Server(httpServer, { cors: { origin: appOrigin, credentials: true } })
  io.use((socket, next) => {
    try {
      const payload = jwt.verify(String(socket.handshake.auth.token ?? ''), jwtSecret)
      if (typeof payload === 'string' || !payload.sub) throw new Error('invalid')
      const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : ''
      if (allowedEmails.length > 0 && !allowedEmails.includes(email)) throw new Error('email_not_allowed')
      socket.data.userId = String(payload.sub)
      next()
    } catch {
      next(new Error('unauthorized'))
    }
  })
  io.on('connection', (socket) => {
    const userId = String(socket.data.userId)
    // 个人频道：接收通知等用户级事件
    socket.join(`user:${userId}`)
    // 自动加入全部所属房间（多房间单连接）
    if (repositories) {
      repositories.rooms.listForUser(userId)
        .then((rooms) => rooms.forEach((room) => socket.join(`room:${room.id}`)))
        .catch(() => undefined)
    }
    socket.on('room.join', (roomId: string) => {
      if (typeof roomId === 'string') socket.join(`room:${roomId}`)
    })
    // 输入中指示：转发给房间内其他人
    socket.on('typing', (payload: unknown) => {
      const roomId = typeof payload === 'object' && payload !== null && 'roomId' in payload
        ? String((payload as { roomId: unknown }).roomId)
        : typeof payload === 'string' ? payload : ''
      if (roomId) socket.to(`room:${roomId}`).emit('typing', { roomId, userId })
    })
    onConnect?.(socket, userId)
  })
  return {
    io,
    emit(roomId: string, event: string, payload: unknown) {
      io.to(`room:${roomId}`).emit(event, payload)
    },
    emitUser(userId: string, event: string, payload: unknown) {
      io.to(`user:${userId}`).emit(event, payload)
    }
  }
}
