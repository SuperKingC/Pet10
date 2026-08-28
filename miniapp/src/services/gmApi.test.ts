import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiRequest = vi.fn()

vi.mock('./apiClient', () => ({ apiRequest }))

describe('gm api', () => {
  beforeEach(() => {
    apiRequest.mockReset()
  })

  it('adds friends with count', async () => {
    apiRequest.mockResolvedValue({ added: [{ userId: 'friend-1', displayName: '测试好友1' }] })
    const { gmApi } = await import('./gmApi')

    const result = await gmApi.addFriends(3)

    expect(apiRequest).toHaveBeenCalledWith('/api/gm/friends', {
      method: 'POST',
      body: { count: 3 }
    })
    expect(result.added).toHaveLength(1)
  })

  it('removes gm-created friends with delete request', async () => {
    apiRequest.mockResolvedValue({ removed: [{ userId: 'friend-1', displayName: '测试好友1' }] })
    const { gmApi } = await import('./gmApi')

    const result = await gmApi.removeFriends()

    expect(apiRequest).toHaveBeenCalledWith('/api/gm/friends', {
      method: 'DELETE'
    })
    expect(result.removed).toHaveLength(1)
  })
})
