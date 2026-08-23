import { apiRequest } from './apiClient'

export interface LaunchContext {
  user: {
    id: string
    displayName: string
    avatarUrl?: string | null
  }
  rooms: Array<{
    id: string
    partner: {
      id: string
      displayName: string
      avatarUrl?: string | null
    }
    pet: {
      id: string
      name: '小多利'
      level: number
      updatedAt: string
    } | null
    lastUsedAt?: string | null
    unreadCount?: number
  }>
  pendingInvitations: Array<{
    token: string
    inviter: {
      id: string
      displayName: string
      avatarUrl?: string | null
    }
    expiresAt: string
  }>
  activeRoomId?: string
  entry: 'shared-room' | 'invite' | 'room-list' | 'waiting-room'
  assetVersion: string
}

export const launchContextApi = {
  get(activeRoomId?: string, invitationToken?: string) {
    const params = [
      activeRoomId ? `activeRoomId=${encodeURIComponent(activeRoomId)}` : '',
      invitationToken ? `invitationToken=${encodeURIComponent(invitationToken)}` : ''
    ].filter(Boolean)
    const query = params.length ? `?${params.join('&')}` : ''
    return apiRequest<LaunchContext>(`/api/session/launch-context${query}`)
  }
}
