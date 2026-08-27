import Taro from '@tarojs/taro'
import {
  nextUnlockState,
  type XiaoduoliUnlockState,
} from '../domain/xiaoduoliUnlock'

const unlockStateKey = 'pet10_xiaoduoli_unlock'
const pendingRoomsKey = 'pet10_xiaoduoli_pending_rooms'

export function readUnlockState(): XiaoduoliUnlockState | null {
  const raw = Taro.getStorageSync<XiaoduoliUnlockState>(unlockStateKey)
  if (!raw || typeof raw !== 'object' || typeof raw.initialized !== 'boolean' || !Array.isArray(raw.unlockedRoomIds)) {
    return null
  }
  return {
    initialized: raw.initialized,
    unlockedRoomIds: raw.unlockedRoomIds.filter((roomId) => typeof roomId === 'string' && roomId),
  }
}

export function writeUnlockState(state: XiaoduoliUnlockState) {
  Taro.setStorageSync(unlockStateKey, state)
}

export function readPendingUnlockRooms() {
  const raw = Taro.getStorageSync<string[]>(pendingRoomsKey)
  return Array.isArray(raw) ? raw.filter((roomId) => typeof roomId === 'string' && roomId) : []
}

export function addPendingUnlockRoom(roomId: string) {
  if (!roomId) return
  Taro.setStorageSync(pendingRoomsKey, [...new Set([...readPendingUnlockRooms(), roomId])])
}

export function clearPendingUnlockRooms() {
  Taro.setStorageSync(pendingRoomsKey, [])
}

export function reconcileStoredUnlock(petRoomIds: string[]) {
  const next = nextUnlockState({
    stored: readUnlockState(),
    petRoomIds,
    pendingRoomIds: readPendingUnlockRooms(),
  })
  writeUnlockState(next)
  if (next.initialized) clearPendingUnlockRooms()
  return next
}
