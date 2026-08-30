export type LaunchEntry = 'shared-room' | 'invite' | 'room-list' | 'waiting-room'

export interface UserSummary {
  id: string
  displayName: string
  avatarUrl?: string | null
  uid?: string
}

export interface RoomSummary {
  id: string
  partner: UserSummary
  // 小多利只能和一位好友共养：名额已满的好友关系仍有房间，但 pet 为 null
  pet: {
    id: string
    name: '小多利'
    level: number
    updatedAt: string
  } | null
  lastUsedAt?: string | null
  unreadCount?: number
}

export interface InvitationSummary {
  token: string
  inviter: UserSummary
  expiresAt: string
}

export interface LaunchContext {
  user: UserSummary
  rooms: RoomSummary[]
  pendingInvitations: InvitationSummary[]
  activeRoomId?: string
  entry: LaunchEntry
  assetVersion: string
}

export interface LaunchContextInput {
  hasValidInvitation: boolean
  hasRooms: boolean
  hasPendingInvitations: boolean
  activeRoomId?: string
}

export function canonicalizeUserPair(firstUserId: string, secondUserId: string): {
  userAId: string
  userBId: string
} {
  if (firstUserId === secondUserId) throw new Error('self_relationship_not_allowed')
  return firstUserId < secondUserId
    ? { userAId: firstUserId, userBId: secondUserId }
    : { userAId: secondUserId, userBId: firstUserId }
}

export function resolveLaunchEntry(input: LaunchContextInput): LaunchEntry {
  if (input.hasValidInvitation) return 'invite'
  if (input.hasRooms && input.activeRoomId) return 'shared-room'
  if (input.hasPendingInvitations) return 'room-list'
  return 'waiting-room'
}
