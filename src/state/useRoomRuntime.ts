import { useCallback, useEffect, useRef, useState } from 'react'
import type { Message, PetMemory, PetState } from '../domain/types'
import { appendUniqueMessage } from '../services/messageCollection'
import { mapServerMessage, type ServerMessage } from '../services/messageMapper'
import { connectRealtime, type RealtimeConnection } from '../services/realtimeClient'
import { socialApi } from '../services/socialApi'
import { upsertMemory } from './memoryState'

export interface RoomRuntime {
  loaded: boolean
  loading?: boolean
  messages: Message[]
  pet: PetState | null
  memories: PetMemory[]
  petTyping: boolean
  friendTyping: boolean
}

export interface RoomRuntimeApi {
  states: Record<string, RoomRuntime>
  loadRoom(roomId: string): Promise<void>
  getRealtime(): RealtimeConnection | undefined
  appendMessage(roomId: string, message: Message): void
  setPet(roomId: string, pet: PetState | null): void
}

export interface RoomRuntimeOptions {
  userId?: string
  /** 收到新消息时的回调（未读计数等） */
  onIncomingMessage?: (roomId: string, message: Message) => void
  onIncomingNotification?: () => void
  onGameEvent?: (event: string, payload: Record<string, unknown>) => void
  onProfileUpdated?: (payload: { userId: string; user: Record<string, unknown> }) => void
  onMapLit?: (payload: { roomId: string; spotId: number; litBy: string }) => void
}

const EMPTY_RUNTIME: RoomRuntime = { loaded: false, messages: [], pet: null, memories: [], petTyping: false, friendTyping: false }

/**
 * 单 socket 多房间状态：所有房间常驻内存，切 tab/切房间不丢消息、不重连。
 */
export function useRoomRuntime(options: RoomRuntimeOptions) {
  const [states, setStates] = useState<Record<string, RoomRuntime>>({})
  const realtimeRef = useRef<RealtimeConnection | undefined>(undefined)
  const optionsRef = useRef(options)
  optionsRef.current = options

  const patchRoom = useCallback((roomId: string, patch: Partial<RoomRuntime> | ((previous: RoomRuntime) => Partial<RoomRuntime>)) => {
    setStates((current) => {
      const previous = current[roomId] ?? EMPTY_RUNTIME
      const resolved = typeof patch === 'function' ? patch(previous) : patch
      return { ...current, [roomId]: { ...previous, ...resolved } }
    })
  }, [])

  const loadRoom = useCallback(async (roomId: string) => {
    setStates((current) => {
      if (current[roomId]?.loaded || current[roomId]?.loading) return current
      return { ...current, [roomId]: { ...(current[roomId] ?? EMPTY_RUNTIME), loading: true } }
    })
    try {
      const bootstrap = await socialApi.bootstrapRoom(roomId, optionsRef.current.userId ?? '')
      patchRoom(roomId, () => ({
        loaded: true,
        messages: bootstrap.messages,
        pet: bootstrap.pet,
        memories: bootstrap.memories
      }))
      realtimeRef.current?.joinRoom(roomId)
    } catch {
      patchRoom(roomId, () => ({ loaded: true }))
    }
  }, [patchRoom])

  const appendMessage = useCallback((roomId: string, message: Message) => {
    patchRoom(roomId, (previous) => ({ messages: appendUniqueMessage(previous.messages, message) }))
  }, [patchRoom])

  const setPet = useCallback((roomId: string, pet: PetState | null) => {
    patchRoom(roomId, { pet })
  }, [patchRoom])

  useEffect(() => {
    const connection = connectRealtime({
      onMessage(payload) {
        const message = mapServerMessage(payload as unknown as ServerMessage, optionsRef.current.userId)
        appendMessage(payload.roomId, message)
        // 小多利发言后清除输入指示
        if (message.sender === 'pet') patchRoom(payload.roomId, { petTyping: false })
        optionsRef.current.onIncomingMessage?.(payload.roomId, message)
      },
      onPetUpdated(payload) {
        const pet = payload as unknown as PetState & { roomId?: string }
        if (!pet.roomId) return
        patchRoom(pet.roomId, { pet })
      },
      onPetTyping({ roomId, typing }) {
        patchRoom(roomId, { petTyping: typing })
      },
      onTyping({ roomId, userId }) {
        if (userId === optionsRef.current.userId) return
        patchRoom(roomId, { friendTyping: true })
        window.setTimeout(() => {
          setStates((current) => {
            const runtime = current[roomId]
            if (!runtime) return current
            return { ...current, [roomId]: { ...runtime, friendTyping: false } }
          })
        }, 3000)
      },
      onMoodUpdated() {
        // 日历面板通过自身刷新接口拉取，这里不处理
      },
      onPostNew() {
        // 动态面板拉取时自然可见
      },
      onNotification() {
        optionsRef.current.onIncomingNotification?.()
      },
      onCodewordUpdated() {
        // 暗号卡打开时拉取最新
      },
      onMemoryCreated(memory) {
        patchRoom(memory.roomId, (previous) => ({
          memories: upsertMemory(previous.memories, memory)
        }))
      },
      onMemoryDeleted({ roomId, id }) {
        if (!roomId) return
        patchRoom(roomId, (previous) => ({ memories: previous.memories.filter((memory) => memory.id !== id) }))
      },
      onGameEvent(event, payload) {
        optionsRef.current.onGameEvent?.(event, payload)
      },
      onProfileUpdated(payload) {
        optionsRef.current.onProfileUpdated?.(payload)
      },
      onMapLit(payload) {
        optionsRef.current.onMapLit?.(payload)
      }
    })
    realtimeRef.current = connection
    return () => connection.disconnect()
  }, [appendMessage, patchRoom])

  return { states, loadRoom, appendMessage, setPet, getRealtime: () => realtimeRef.current, patchRoom }
}
