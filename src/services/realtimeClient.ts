import { io, type Socket } from 'socket.io-client'
import { getAccessToken } from './httpClient'
import { runtimeConfig } from './runtimeConfig'

export interface RealtimeHandlers {
  onMessage: (message: unknown) => void
  onPetUpdated: (pet: unknown) => void
  onMemoryDeleted: (payload: { id: string }) => void
}

export function connectRealtime(roomId: string, handlers: RealtimeHandlers): Socket | undefined {
  const token = getAccessToken()
  if (!token || runtimeConfig.useMockApi) return undefined
  const socket = io(runtimeConfig.apiBaseUrl, {
    auth: { token },
    transports: ['websocket']
  })
  socket.on('connect', () => socket.emit('room.join', roomId))
  socket.on('message.created', handlers.onMessage)
  socket.on('pet.updated', handlers.onPetUpdated)
  socket.on('memory.deleted', handlers.onMemoryDeleted)
  return socket
}
