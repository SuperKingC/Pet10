import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiRequest = vi.fn()

vi.mock('./apiClient', () => ({ apiRequest }))

describe('launch context api', () => {
  beforeEach(() => {
    apiRequest.mockReset()
  })

  it('sends the invitation token with the active room', async () => {
    apiRequest.mockResolvedValue({ entry: 'invite' })
    const { launchContextApi } = await import('./launchContextApi')

    await launchContextApi.get('room-1', 'invite token')

    expect(apiRequest).toHaveBeenCalledWith(
      '/api/session/launch-context?activeRoomId=room-1&invitationToken=invite%20token'
    )
  })
})
