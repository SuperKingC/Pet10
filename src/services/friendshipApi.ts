import { apiRequest } from './httpClient'
import type { ServerRelationship } from './sessionApi'

export const friendshipApi = {
  sendRequest(identifier: string) {
    return apiRequest<ServerRelationship>('/api/friendships', {
      method: 'POST',
      body: JSON.stringify({ identifier })
    })
  },
  acceptRequest(relationshipId: string) {
    return apiRequest<ServerRelationship>(`/api/friendships/${relationshipId}/accept`, {
      method: 'POST',
      body: '{}'
    })
  }
}
