import { io, type Socket } from 'socket.io-client'
import { getAccessToken } from './httpClient'
import { runtimeConfig } from './runtimeConfig'
import type { AppNotification, MoodEntry, Post } from '../domain/types'

/**
 * 单 socket 连接订阅全部房间 + 个人通知频道。
 * 所有房间事件的 payload 均携带 roomId，由上层按房间分发。
 */
export interface RealtimeHandlers {
  onMessage: (payload: { roomId: string } & Record<string, unknown>) => void
  onPetUpdated: (payload: { roomId?: string } & Record<string, unknown>) => void
  onPetTyping: (payload: { roomId: string; typing: boolean }) => void
  onTyping: (payload: { roomId: string; userId: string }) => void
  onMoodUpdated: (entry: MoodEntry) => void
  onPostNew: (post: Post) => void
  onNotification: (notification: AppNotification) => void
  onCodewordUpdated: (payload: { roomId: string; day: string; answeredCount: number }) => void
  onMemoryDeleted: (payload: { roomId?: string; id: string }) => void
  onGameEvent?: (event: string, payload: Record<string, unknown>) => void
}

const GAME_EVENTS = [
  'game:invite', 'game:accepted', 'game:declined', 'game:move', 'game:end', 'game:sync', 'game:cancelled'
]

export interface RealtimeConnection {
  socket: Socket | undefined
  joinRoom(roomId: string): void
  sendTyping(roomId: string): void
  emitGame(event: string, payload: Record<string, unknown>): void
  disconnect(): void
}

export function connectRealtime(handlers: RealtimeHandlers): RealtimeConnection {
  const token = getAccessToken()
  if (!token || runtimeConfig.useMockApi) {
    return {
      socket: undefined,
      joinRoom: () => undefined,
      sendTyping: () => undefined,
      emitGame: () => undefined,
      disconnect: () => undefined
    }
  }
  const socket = io(runtimeConfig.apiBaseUrl, {
    auth: { token },
    transports: ['websocket']
  })
  socket.on('message.created', (payload) => handlers.onMessage(payload as { roomId: string }))
  socket.on('pet.updated', (payload) => handlers.onPetUpdated(payload as { roomId?: string }))
  socket.on('pet.typing', (payload) => handlers.onPetTyping(payload as { roomId: string; typing: boolean }))
  socket.on('typing', (payload) => handlers.onTyping(payload as { roomId: string; userId: string }))
  socket.on('mood.updated', (payload) => handlers.onMoodUpdated(payload as MoodEntry))
  socket.on('post.new', (payload) => handlers.onPostNew(payload as Post))
  socket.on('notification.new', (payload) => handlers.onNotification(payload as AppNotification))
  socket.on('codeword.updated', (payload) => handlers.onCodewordUpdated(payload as { roomId: string; day: string; answeredCount: number }))
  socket.on('memory.deleted', (payload) => handlers.onMemoryDeleted(payload as { roomId?: string; id: string }))
  for (const event of GAME_EVENTS) {
    socket.on(event, (payload) => handlers.onGameEvent?.(event, (payload ?? {}) as Record<string, unknown>))
  }
  return {
    socket,
    joinRoom(roomId: string) {
      socket.emit('room.join', roomId)
    },
    sendTyping(roomId: string) {
      socket.emit('typing', { roomId })
    },
    emitGame(event: string, payload: Record<string, unknown>) {
      socket.emit(event, payload)
    },
    disconnect() {
      socket.disconnect()
    }
  }
}

