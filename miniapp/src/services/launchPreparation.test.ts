import { describe, expect, it, vi } from 'vitest'
import type { LaunchContext } from './launchContextApi'
import type { RoomBootstrap } from './petApi'
import { prepareLaunchContext } from './launchPreparation'

const context: LaunchContext = {
  user: { id: 'user-1', displayName: 'One' },
  rooms: [],
  pendingInvitations: [],
  activeRoomId: 'room-1',
  entry: 'room-list',
  assetVersion: 'v1',
}

const roomBootstrap: RoomBootstrap = {
  room: { id: 'room-1', type: 'pair', proactiveEnabled: true },
  pet: {
    id: 'pet-1',
    name: '小多利',
    level: 1,
    experience: 0,
    experienceToNextLevel: 10,
    hunger: 1,
    mood: 1,
    energy: 1,
    health: 1,
    intimacy: 1,
  },
}

describe('prepareLaunchContext', () => {
  it('propagates context failures', async () => {
    const getContext = vi.fn().mockRejectedValue(new Error('offline'))
    const getPet = vi.fn()

    await expect(prepareLaunchContext(getContext, getPet)).rejects.toThrow('offline')
    expect(getPet).not.toHaveBeenCalled()
  })

  it('propagates current-pet failures after context succeeds', async () => {
    const getContext = vi.fn().mockResolvedValue(context)
    const getPet = vi.fn().mockRejectedValue(new Error('pet unavailable'))

    await expect(prepareLaunchContext(getContext, getPet)).rejects.toThrow('pet unavailable')
  })

  it('returns context, active room, and mapped pet only after both requests succeed', async () => {
    const getContext = vi.fn().mockResolvedValue(context)
    const getPet = vi.fn().mockResolvedValue(roomBootstrap)

    await expect(prepareLaunchContext(getContext, getPet)).resolves.toEqual({
      context,
      roomId: 'room-1',
      pet: expect.objectContaining({ id: 'pet-1', name: '小多利' }),
    })
  })
})
