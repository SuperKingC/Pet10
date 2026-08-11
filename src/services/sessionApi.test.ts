import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiRequest = vi.fn()

vi.mock('./httpClient', () => ({ apiRequest }))

describe('sessionApi', () => {
  beforeEach(() => {
    apiRequest.mockReset()
  })

  it('passes an abort signal to the startup session request', async () => {
    apiRequest.mockResolvedValue({
      status: 'unbound',
      user: { id: 'user-1', email: 'one@example.com', username: 'one', displayName: 'One' }
    })
    const { sessionApi } = await import('./sessionApi')
    const controller = new AbortController()

    await sessionApi.getHome({ signal: controller.signal })

    expect(apiRequest).toHaveBeenCalledWith('/api/session', { signal: controller.signal })
  })
})
