import { apiRequest } from './apiClient'
import type { ItemId, MiniappInventory, MiniappNestTask } from '../domain/nestTaskModel'

export interface ClaimResult {
  taskKey: string
  grantedItems: Array<{ itemId: ItemId; count: number }>
}

/** 客户端行为上报的 metric（与服务端 nestTaskRoutes 的枚举同口径） */
export type NestActivityMetric = 'gobang_pet' | 'gobang_friend' | 'tarot' | 'profile' | 'diary' | 'anniversary'

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
  },
  /** 行为上报：五子棋完局/塔罗解读/写日记/设纪念日/设置资料 → 计入当日每日任务进度 */
  reportActivity(roomId: string, metric: NestActivityMetric) {
    return apiRequest<{ ok: boolean }>(`/api/rooms/${encodeURIComponent(roomId)}/activities`, {
      method: 'POST',
      body: { metric }
    })
  }
}
