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

export interface GmAddNestItemsResult {
  rooms: number
  grantedPerItem: number
}

export interface GmWardrobeUnlockResult {
  rooms: number
  gmUnlockAll: boolean
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
  },
  /** GM：当前账号全部小窝每件照顾道具 +9 */
  addNestItems() {
    return apiRequest<GmAddNestItemsResult>('/api/gm/nest/items', {
      method: 'POST'
    })
  },
  /** GM：衣柜全解锁开关（false=恢复按条件解锁） */
  setWardrobeUnlockAll(enabled: boolean) {
    return apiRequest<GmWardrobeUnlockResult>('/api/gm/wardrobe/unlock-all', {
      method: 'POST',
      body: { enabled }
    })
  }
}
