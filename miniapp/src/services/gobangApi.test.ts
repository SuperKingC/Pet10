import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiRequest = vi.fn()
vi.mock('./apiClient', () => ({ apiRequest }))

describe('gobang api', () => {
  beforeEach(() => apiRequest.mockReset())

  it('uses the polling and command endpoints', async () => {
    apiRequest.mockResolvedValue({})
    const { gobangApi } = await import('./gobangApi')
    await gobangApi.getState()
    await gobangApi.invite('friend', 'room id')
    await gobangApi.accept('invite id')
    await gobangApi.move('game id', 3, 4)
    await gobangApi.resign('game id')

    expect(apiRequest).toHaveBeenNthCalledWith(1, '/api/games/gobang/state')
    expect(apiRequest).toHaveBeenNthCalledWith(2, '/api/games/gobang/invitations', { method: 'POST', body: { toUserId: 'friend', roomId: 'room id' } })
    expect(apiRequest).toHaveBeenNthCalledWith(3, '/api/games/gobang/invitations/invite%20id/accept', { method: 'POST' })
    expect(apiRequest).toHaveBeenNthCalledWith(4, '/api/games/gobang/games/game%20id/moves', { method: 'POST', body: { x: 3, y: 4 } })
    expect(apiRequest).toHaveBeenNthCalledWith(5, '/api/games/gobang/games/game%20id/resign', { method: 'POST' })
  })
})
