import { apiRequest } from './apiClient'
import type { ItemId, MiniappInventory, MiniappNestTask } from '../domain/nestTaskModel'

export interface ClaimResult {
  taskKey: string
  grantedItems: Array<{ itemId: ItemId; count: number }>
}

export const nestTaskApi = {
  list(roomId: string) {
    return apiRequest<MiniappNestTask[]>(`/api/rooms/${encodeURIComponent(roomId)}/tasks`)
  },
  inventory(roomId: string) {
    return apiRequest<MiniappInventory>(`/api/rooms/${encodeURIComponent(roomId)}/inventory`)
  },
  claim(roomId: string, taskKey: string) {
    return apiRequest<ClaimResult>(`/api/rooms/${encodeURIComponent(roomId)}/tasks/${encodeURIComponent(taskKey)}/claim`, {
      method: 'POST'
    })
  },
  checkin(roomId: string) {
    return apiRequest<{ consecutiveDay: number }>(`/api/rooms/${encodeURIComponent(roomId)}/checkin`, {
      method: 'POST'
    })
  }
}
