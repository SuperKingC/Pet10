import { describe, expect, it } from 'vitest'
import {
  canonicalizeUserPair,
  resolveLaunchEntry,
  type LaunchContextInput
} from './launchContext.js'

describe('launch context domain', () => {
  it('canonicalizes a user pair regardless of invitation direction', () => {
    expect(canonicalizeUserPair('user-b', 'user-a')).toEqual({
      userAId: 'user-a',
      userBId: 'user-b'
    })
  })

  it('opens an invitation before an existing room', () => {
    const input: LaunchContextInput = {
      hasValidInvitation: true,
      hasRooms: true,
      hasPendingInvitations: false,
      activeRoomId: 'room-a'
    }

    expect(resolveLaunchEntry(input)).toBe('invite')
  })

  it('restores the active room when no invitation is present', () => {
    const input: LaunchContextInput = {
      hasValidInvitation: false,
      hasRooms: true,
      hasPendingInvitations: true,
      activeRoomId: 'room-a'
    }

    expect(resolveLaunchEntry(input)).toBe('shared-room')
  })

  it('opens the room list when invitations exist without rooms', () => {
    const input: LaunchContextInput = {
      hasValidInvitation: false,
      hasRooms: false,
      hasPendingInvitations: true
    }

    expect(resolveLaunchEntry(input)).toBe('room-list')
  })

  it('opens a waiting room when the user has no room or invitation', () => {
    const input: LaunchContextInput = {
      hasValidInvitation: false,
      hasRooms: false,
      hasPendingInvitations: false
    }

    expect(resolveLaunchEntry(input)).toBe('waiting-room')
  })
})
