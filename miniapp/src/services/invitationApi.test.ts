import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiRequest = vi.fn()

vi.mock('./apiClient', () => ({ apiRequest }))

describe('invitation api', () => {
  beforeEach(() => {
    apiRequest.mockReset()
  })

  it('accepts an invitation with authentication', async () => {
    apiRequest.mockResolvedValue({ room: { id: 'room-1' } })
    const { invitationApi } = await import('./invitationApi')

    await invitationApi.accept('invite token')

    expect(apiRequest).toHaveBeenCalledWith('/api/invitations/invite%20token/accept', {
      method: 'POST'
    })
  })
})
