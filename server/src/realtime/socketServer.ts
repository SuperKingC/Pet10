import type { Server as HttpServer } from 'node:http'
import jwt from 'jsonwebtoken'
import { Server } from 'socket.io'

export function createSocketServer(httpServer: HttpServer, appOrigin: string, jwtSecret: string) {
  const io = new Server(httpServer, { cors: { origin: appOrigin, credentials: true } })
  io.use((socket, next) => {
    try {
      const payload = jwt.verify(String(socket.handshake.auth.token ?? ''), jwtSecret)
      if (typeof payload === 'string' || !payload.sub) throw new Error('invalid')
      socket.data.userId = String(payload.sub)
      next()
    } catch {
      next(new Error('unauthorized'))
    }
  })
  io.on('connection', (socket) => {
    socket.on('room.join', (roomId: string) => socket.join(`room:${roomId}`))
  })
  return {
    io,
    emit(roomId: string, event: string, payload: unknown) {
      io.to(`room:${roomId}`).emit(event, payload)
    }
  }
}
