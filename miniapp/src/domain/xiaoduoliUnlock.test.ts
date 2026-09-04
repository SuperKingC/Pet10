import { describe, expect, it } from 'vitest'
import {
  UNLOCK_BUTTON_LABEL,
  UNLOCK_JUMP_DURATION_MS,
  createUnlockEffects,
  isRoomUnlocked,
  nextUnlockState,
  unlockRoom,
} from './xiaoduoliUnlock'

describe('xiaoduoli unlock', () => {
  it('initializes a waiting nest so a later accepted room stays locked for the inviter', () => {
    const waiting = nextUnlockState({
      stored: null,
      petRoomIds: [],
      pendingRoomIds: [],
    })

    expect(waiting).toEqual({
      initialized: true,
      unlockedRoomIds: [],
    })
    expect(isRoomUnlocked(nextUnlockState({
      stored: waiting,
      petRoomIds: ['room-new'],
      pendingRoomIds: [],
    }), 'room-new')).toBe(false)
  })

  it('keeps existing pets revealed when the feature first initializes', () => {
    const state = nextUnlockState({
      stored: null,
      petRoomIds: ['room-old'],
      pendingRoomIds: [],
    })

    expect(state).toEqual({
      initialized: true,
      unlockedRoomIds: ['room-old'],
    })
    expect(isRoomUnlocked(state, 'room-old')).toBe(true)
  })

  it('keeps a newly accepted room locked even on first launch', () => {
    const state = nextUnlockState({
      stored: null,
      petRoomIds: ['room-new'],
      pendingRoomIds: ['room-new'],
    })

    expect(isRoomUnlocked(state, 'room-new')).toBe(false)
    expect(state.unlockedRoomIds).toEqual([])
  })

  it('does not auto-unlock a pet room that appears after initialization', () => {
    const state = nextUnlockState({
      stored: { initialized: true, unlockedRoomIds: [] },
      petRoomIds: ['room-new'],
      pendingRoomIds: [],
    })

    expect(isRoomUnlocked(state, 'room-new')).toBe(false)
  })

  it('removes a pending room from the unlocked list', () => {
    const state = nextUnlockState({
      stored: { initialized: true, unlockedRoomIds: ['room-a', 'room-b'] },
      petRoomIds: ['room-a', 'room-b'],
      pendingRoomIds: ['room-b'],
    })

    expect(state.unlockedRoomIds).toEqual(['room-a'])
    expect(isRoomUnlocked(state, 'room-b')).toBe(false)
  })

  it('unlocks a room after the player confirms', () => {
    const locked = nextUnlockState({
      stored: { initialized: true, unlockedRoomIds: ['room-a'] },
      petRoomIds: ['room-a', 'room-b'],
      pendingRoomIds: ['room-b'],
    })

    expect(unlockRoom(locked, 'room-b').unlockedRoomIds).toEqual(['room-a', 'room-b'])
  })

  it('treats a missing room as still locked', () => {
    expect(isRoomUnlocked({ initialized: true, unlockedRoomIds: ['room-a'] }, '')).toBe(false)
    expect(isRoomUnlocked(null, 'room-a')).toBe(false)
  })

  it('builds a deterministic burst of ribbons, stars and cardboard scraps', () => {
    const first = createUnlockEffects('room-1')
    const second = createUnlockEffects('room-1')
    const other = createUnlockEffects('room-2')

    expect(first).toEqual(second)
    expect(first).not.toEqual(other)
    expect(first.ribbons).toHaveLength(24)
    expect(first.stars).toHaveLength(8)
    expect(first.scraps).toHaveLength(10)
    expect(first.ribbons[0]).toEqual(expect.objectContaining({
      left: expect.any(Number),
      delay: expect.any(Number),
      duration: expect.any(Number),
      rotate: expect.any(Number),
      color: expect.any(String),
    }))
    expect(first.scraps[0]).toEqual(expect.objectContaining({
      left: expect.any(Number),
      delay: expect.any(Number),
      duration: expect.any(Number),
      rotate: expect.any(Number),
      drift: expect.any(Number),
      size: expect.any(Number),
      color: expect.any(String),
    }))
  })

  it('exposes the unlock button copy and jump duration', () => {
    expect(UNLOCK_BUTTON_LABEL).toBe('玩家已接受邀请解锁小多利~')
    expect(UNLOCK_JUMP_DURATION_MS).toBe(1600)
  })
})
