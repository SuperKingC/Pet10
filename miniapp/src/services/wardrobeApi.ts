import { apiRequest } from './apiClient'
import type { MatchToday, OutfitPieces, WardrobeView } from '../domain/wardrobeModel'

export const wardrobeApi = {
  get(roomId: string) {
    return apiRequest<WardrobeView>(`/api/rooms/${encodeURIComponent(roomId)}/wardrobe`)
  },
  /** 按类别保存穿戴（body 必有，配饰可 null=未佩戴）；旧服务端载荷 { itemKey } 已废弃 */
  setEquipped(roomId: string, outfit: OutfitPieces) {
    return apiRequest<{ equipped: string; outfit: OutfitPieces }>(`/api/rooms/${encodeURIComponent(roomId)}/wardrobe`, {
      method: 'PUT',
      body: { outfit }
    })
  },
  /** 默契换装按主体服装提交 */
  submitMatchPick(roomId: string, itemKey: string) {
    return apiRequest<MatchToday>(`/api/rooms/${encodeURIComponent(roomId)}/wardrobe/match`, {
      method: 'POST',
      body: { itemKey }
    })
  }
}
