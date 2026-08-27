import { beforeEach, describe, expect, it, vi } from 'vitest'

const getStorageSync = vi.fn()
const setStorageSync = vi.fn()

vi.mock('@tarojs/taro', () => ({
  default: {
    getStorageSync,
    setStorageSync,
  },
}))

describe('xiaoduoli unlock storage', () => {
  beforeEach(() => {
    getStorageSync.mockReset()
    setStorageSync.mockReset()
  })

  it('records a pending room after invitation accept and reconciles it as locked', async () => {
    const pending: string[] = []
    const stored = { initialized: true, unlockedRoomIds: ['room-old'] }
    getStorageSync.mockImplementation((key: string) => {
      if (key === 'pet10_xiaoduoli_pending_rooms') return pending
      if (key === 'pet10_xiaoduoli_unlock') return stored
      return ''
    })
    setStorageSync.mockImplementation((key: string, value: unknown) => {
      if (key === 'pet10_xiaoduoli_pending_rooms') {
        pending.splice(0, pending.length, ...(value as string[]))
      }
    })

    const storage = await import('./xiaoduoliUnlockStorage')
    storage.addPendingUnlockRoom('room-new')
    const next = storage.reconcileStoredUnlock(['room-old', 'room-new'])

    expect(next).toEqual({
      initialized: true,
      unlockedRoomIds: ['room-old'],
    })
    expect(setStorageSync).toHaveBeenCalledWith('pet10_xiaoduoli_unlock', next)
    expect(setStorageSync).toHaveBeenCalledWith('pet10_xiaoduoli_pending_rooms', [])
  })
})
