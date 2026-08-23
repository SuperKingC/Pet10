import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Message } from '../domain/types'
import { useRoomRuntime } from './useRoomRuntime'

const bootstrapRoom = vi.hoisted(() => vi.fn())
let realtimeHandlers: { onMessage: (payload: { roomId: string } & Record<string, unknown>) => void } | undefined
const connection = {
  socket: undefined,
  joinRoom: vi.fn(),
  sendTyping: vi.fn(),
  emitGame: vi.fn(),
  disconnect: vi.fn(),
}

vi.mock('../services/socialApi', () => ({ socialApi: { bootstrapRoom } }))
vi.mock('../services/realtimeClient', () => ({
  connectRealtime: vi.fn((handlers) => {
    realtimeHandlers = handlers
    return connection
  }),
}))

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const snapshotMessage = (id: string): Message => ({
  id,
  sender: 'friend',
  kind: 'text',
  text: id,
  createdAt: '10:00',
  senderId: 'friend-1',
})

const bootstrap = (messages: Message[] = []) => ({
  room: { id: 'room-1', type: 'pair' as const, proactiveEnabled: true },
  pet: null,
  messages,
  memories: [],
})

function renderRuntime() {
  let current!: ReturnType<typeof useRoomRuntime>
  const root = createRoot(document.createElement('div'))
  function Harness() {
    current = useRoomRuntime({ userId: 'user-1' })
    return null
  }
  act(() => root.render(<Harness />))
  return { root, get current() { return current } }
}

describe('useRoomRuntime room bootstrap', () => {
  beforeEach(() => {
    bootstrapRoom.mockReset()
    connection.joinRoom.mockReset()
    connection.disconnect.mockReset()
    realtimeHandlers = undefined
  })

  it('shares one bootstrap promise between concurrent callers and skips later successful loads', async () => {
    let resolve!: (value: ReturnType<typeof bootstrap>) => void
    bootstrapRoom.mockReturnValue(new Promise((resolvePromise) => { resolve = resolvePromise }))
    const runtime = renderRuntime()

    let first!: Promise<void>
    let second!: Promise<void>
    act(() => {
      first = runtime.current.loadRoom('room-1')
      second = runtime.current.loadRoom('room-1')
    })
    expect(bootstrapRoom).toHaveBeenCalledTimes(1)
    expect(first).toBe(second)

    await act(async () => {
      resolve(bootstrap())
      await first
    })
    await act(async () => { await runtime.current.loadRoom('room-1') })
    expect(bootstrapRoom).toHaveBeenCalledTimes(1)
    act(() => runtime.root.unmount())
  })

  it('keeps a realtime message that arrives while bootstrap is in flight', async () => {
    let resolve!: (value: ReturnType<typeof bootstrap>) => void
    bootstrapRoom.mockReturnValue(new Promise((resolvePromise) => { resolve = resolvePromise }))
    const runtime = renderRuntime()

    let load!: Promise<void>
    act(() => { load = runtime.current.loadRoom('room-1') })
    act(() => {
      realtimeHandlers?.onMessage({
        roomId: 'room-1',
        id: 'live-1',
        senderType: 'user',
        senderId: 'friend-1',
        kind: 'text',
        text: 'live',
        createdAt: '2026-08-23T00:00:03Z',
      })
    })
    act(() => runtime.current.appendMessage('room-1', snapshotMessage('live-2')))
    await act(async () => {
      resolve(bootstrap([snapshotMessage('snapshot-1'), snapshotMessage('live-1')]))
      await load
    })
    expect(runtime.current.states['room-1'].messages.map(({ id }) => id)).toEqual(['snapshot-1', 'live-1', 'live-2'])
    act(() => runtime.root.unmount())
  })

  it('removes a failed request from the in-flight cache so a later call can retry', async () => {
    bootstrapRoom
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(bootstrap())
    const runtime = renderRuntime()

    await act(async () => { await runtime.current.loadRoom('room-1') })
    expect(runtime.current.states['room-1'].loaded).toBe(false)
    expect(runtime.current.states['room-1'].loading).toBe(false)
    await act(async () => { await runtime.current.loadRoom('room-1') })
    expect(bootstrapRoom).toHaveBeenCalledTimes(2)
    act(() => runtime.root.unmount())
  })
})
