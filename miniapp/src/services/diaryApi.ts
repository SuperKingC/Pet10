import { apiRequest } from './apiClient'

export interface MiniappDiary {
  id: string
  day: string
  title: string
  body: string
  location: string
  photos: string[]
  liked: boolean
  createdAt: string
  updatedAt: string
}

export interface DiaryInput {
  day: string
  title: string
  body: string
  location: string
  photos: string[]
}

export type DiaryPatch = Partial<Omit<DiaryInput, 'day'>>

export const diaryApi = {
  list(from: string, to: string) {
    return apiRequest<MiniappDiary[]>(`/api/diaries?from=${from}&to=${to}`)
  },
  create(input: DiaryInput) {
    return apiRequest<MiniappDiary>('/api/diaries', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    })
  },
  update(id: string, patch: DiaryPatch) {
    return apiRequest<MiniappDiary>(`/api/diaries/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: patch as unknown as Record<string, unknown>,
    })
  },
  remove(id: string) {
    return apiRequest<{ ok: boolean }>(`/api/diaries/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },
  toggleLike(id: string) {
    return apiRequest<MiniappDiary>(`/api/diaries/${encodeURIComponent(id)}/like`, {
      method: 'POST',
    })
  },
}
