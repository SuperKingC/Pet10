import { apiRequest } from './apiClient'
import type { PhotoWallItem } from '../domain/photoWallModel'

export const PHOTO_DATAURL_MAX_CHARS = 300_000

export const photoWallApi = {
  list(roomId: string) {
    return apiRequest<{ photos: PhotoWallItem[] }>(`/api/rooms/${encodeURIComponent(roomId)}/photos`)
  },
  create(roomId: string, input: { photo: string; caption?: string; takenDay?: string }) {
    return apiRequest<PhotoWallItem>(`/api/rooms/${encodeURIComponent(roomId)}/photos`, {
      method: 'POST',
      body: input
    })
  },
  updateCaption(roomId: string, photoId: string, caption: string) {
    return apiRequest<PhotoWallItem>(`/api/rooms/${encodeURIComponent(roomId)}/photos/${encodeURIComponent(photoId)}`, {
      method: 'PATCH',
      body: { caption }
    })
  },
  remove(roomId: string, photoId: string) {
    return apiRequest<{ ok: boolean }>(`/api/rooms/${encodeURIComponent(roomId)}/photos/${encodeURIComponent(photoId)}`, {
      method: 'DELETE'
    })
  }
}
