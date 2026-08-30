import { apiRequest } from './apiClient'
import type { ItemId, MiniappInventory, MiniappNestTask, NestTaskRepeat } from '../domain/nestTaskModel'

export interface NestTaskCompleteResult {
  task: MiniappNestTask
  pet: {
    id: string
    level: number
    experience: number
    experienceToNextLevel: number
  }
  leveledUp: boolean
  grantedItems: Array<{ itemId: ItemId; count: number }>
}

export interface NestTaskInputPayload {
  title: string
  icon: string
  repeatRule: NestTaskRepeat
  rewardItems: Array<{ itemId: ItemId; count: number }>
  rewardExp: number
}

export const nestTaskApi = {
  list(roomId: string) {
    return apiRequest<MiniappNestTask[]>(`/api/rooms/${encodeURIComponent(roomId)}/tasks`)
  },
  inventory(roomId: string) {
    return apiRequest<MiniappInventory>(`/api/rooms/${encodeURIComponent(roomId)}/inventory`)
  },
  create(roomId: string, input: NestTaskInputPayload) {
    return apiRequest<MiniappNestTask>(`/api/rooms/${encodeURIComponent(roomId)}/tasks`, {
      method: 'POST',
      body: input as unknown as Record<string, unknown>
    })
  },
  update(roomId: string, taskId: string, patch: Partial<NestTaskInputPayload> & { archived?: boolean }) {
    return apiRequest<MiniappNestTask>(`/api/rooms/${encodeURIComponent(roomId)}/tasks/${encodeURIComponent(taskId)}`, {
      method: 'PATCH',
      body: patch as Record<string, unknown>
    })
  },
  complete(roomId: string, taskId: string) {
    return apiRequest<NestTaskCompleteResult>(`/api/rooms/${encodeURIComponent(roomId)}/tasks/${encodeURIComponent(taskId)}/complete`, {
      method: 'POST'
    })
  }
}
