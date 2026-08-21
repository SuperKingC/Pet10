import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiRequest = vi.fn()

vi.mock('./apiClient', () => ({ apiRequest }))

describe('room api', () => {
  beforeEach(() => {
    apiRequest.mockReset()
  })

  it('uses the authenticated room endpoints', async () => {
    apiRequest.mockResolvedValue({})
    const { roomApi } = await import('./roomApi')

    await roomApi.bootstrap('room id')
    await roomApi.listMessages('room id')
    await roomApi.sendMessage('room id', '你好')
    await roomApi.requestPetReply('room id')

    expect(apiRequest).toHaveBeenNthCalledWith(1, '/api/rooms/room%20id')
    expect(apiRequest).toHaveBeenNthCalledWith(2, '/api/rooms/room%20id/messages')
    expect(apiRequest).toHaveBeenNthCalledWith(3, '/api/rooms/room%20id/messages', {
      method: 'POST',
      body: { text: '你好' },
    })
    expect(apiRequest).toHaveBeenNthCalledWith(4, '/api/rooms/room%20id/pet-replies', {
      method: 'POST',
    })
  })
})
