import { apiRequest } from './apiClient'
import type { MatchToday, WardrobeView } from '../domain/wardrobeModel'

export const wardrobeApi = {
  get(roomId: string) {
    return apiRequest<WardrobeView>(`/api/rooms/${encodeURIComponent(roomId)}/wardrobe`)
  },
  setEquipped(roomId: string, itemKey: string) {
    return apiRequest<{ equipped: string }>(`/api/rooms/${encodeURIComponent(roomId)}/wardrobe`, {
      method: 'PUT',
      body: { itemKey }
    })
  },
  submitMatchPick(roomId: string, itemKey: string) {
    return apiRequest<MatchToday>(`/api/rooms/${encodeURIComponent(roomId)}/wardrobe/match`, {
      method: 'POST',
      body: { itemKey }
    })
  }
}
