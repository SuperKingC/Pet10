import { apiRequest } from './apiClient'

export interface InvitationSummary {
  token: string
  inviter: {
    id: string
    displayName: string
    avatarUrl?: string | null
  }
  expiresAt: string
}

export interface InvitationAcceptance {
  room: { id: string }
}

export const invitationApi = {
  create() {
    return apiRequest<InvitationSummary>('/api/invitations', { method: 'POST' })
  },
  get(token: string) {
    return apiRequest<InvitationSummary>(`/api/invitations/${encodeURIComponent(token)}`)
  },
  accept(token: string) {
    return apiRequest<InvitationAcceptance>(`/api/invitations/${encodeURIComponent(token)}/accept`, {
      method: 'POST'
    })
  },
  decline(token: string) {
    return apiRequest<void>(`/api/invitations/${encodeURIComponent(token)}/decline`, {
      method: 'POST'
    })
  }
}
