import { apiRequest } from './apiClient'

export interface GobangGameState {
  id: string
  roomId: string
  blackUserId: string
  whiteUserId: string
  moves: Array<{ x: number; y: number; color: 'black' | 'white' }>
  turn: 'black' | 'white'
  status: 'playing' | 'finished'
  winnerUserId: string | null
  reason: 'five' | 'resign' | 'timeout' | null
}

export interface GobangInvitation {
  inviteId: string
  fromUserId: string
  roomId: string
  createdAt: number
}

export const gobangApi = {
  getState() {
    return apiRequest<{ game: GobangGameState | null; invitations: GobangInvitation[] }>('/api/games/gobang/state')
  },
  invite(toUserId: string, roomId: string) {
    return apiRequest<{ inviteId: string }>('/api/games/gobang/invitations', {
      method: 'POST',
      body: { toUserId, roomId },
    })
  },
  accept(inviteId: string) {
    return apiRequest<GobangGameState>(`/api/games/gobang/invitations/${encodeURIComponent(inviteId)}/accept`, { method: 'POST' })
  },
  decline(inviteId: string) {
    return apiRequest<{ ok: boolean }>(`/api/games/gobang/invitations/${encodeURIComponent(inviteId)}/decline`, { method: 'POST' })
  },
  move(gameId: string, x: number, y: number) {
    return apiRequest<{ finished: boolean; winnerUserId: string | null }>(`/api/games/gobang/games/${encodeURIComponent(gameId)}/moves`, {
      method: 'POST',
      body: { x, y },
    })
  },
  resign(gameId: string) {
    return apiRequest<{ ok: boolean }>(`/api/games/gobang/games/${encodeURIComponent(gameId)}/resign`, { method: 'POST' })
  },
}
