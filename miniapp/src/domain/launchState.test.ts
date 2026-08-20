import { describe, expect, it } from 'vitest'
import { resolveMiniappLaunchState } from './launchState'

describe('miniapp launch state', () => {
  it('prioritizes an invitation token', () => {
    expect(resolveMiniappLaunchState({
      entry: 'shared-room',
      activeRoomId: 'room-1',
      rooms: [{ id: 'room-1' }]
    }, 'invite-token')).toBe('invite')
  })

  it('keeps the server-selected waiting room state', () => {
    expect(resolveMiniappLaunchState({
      entry: 'waiting-room',
      rooms: []
    })).toBe('waiting-room')
  })
})
