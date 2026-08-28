import { apiRequest } from './apiClient'

export interface GmFriendSummary {
  userId: string
  displayName: string
}

export interface GmAddFriendsResult {
  added: GmFriendSummary[]
}

export interface GmRemoveFriendsResult {
  removed: GmFriendSummary[]
}

export const gmApi = {
  addFriends(count: number) {
    return apiRequest<GmAddFriendsResult>('/api/gm/friends', {
      method: 'POST',
      body: { count }
    })
  },
  removeFriends() {
    return apiRequest<GmRemoveFriendsResult>('/api/gm/friends', {
      method: 'DELETE'
    })
  }
}
