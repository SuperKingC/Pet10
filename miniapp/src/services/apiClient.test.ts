import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.hoisted(() => vi.fn())
const getStorageSync = vi.hoisted(() => vi.fn())
const removeStorageSync = vi.hoisted(() => vi.fn())

vi.mock('@tarojs/taro', () => ({
  default: {
    request,
    getStorageSync,
    setStorageSync: vi.fn(),
    removeStorageSync,
  },
}))

describe('apiRequest timeout', () => {
  beforeEach(() => {
    request.mockReset().mockResolvedValue({ statusCode: 200, data: { ok: true } })
    getStorageSync.mockReset().mockReturnValue('')
  })

  it('uses a bounded default timeout', async () => {
    const { apiRequest } = await import('./apiClient')

    await apiRequest('/api/test')

    expect(request).toHaveBeenCalledWith(expect.objectContaining({ timeout: 15_000 }))
  })

  it('allows a long-running request to override the timeout', async () => {
    const { apiRequest } = await import('./apiClient')

    await apiRequest('/api/test', { timeoutMs: 30_000 })

    expect(request).toHaveBeenCalledWith(expect.objectContaining({ timeout: 30_000 }))
  })
})

describe('apiRequest session recovery', () => {
  beforeEach(() => {
    vi.resetModules()
    request.mockReset()
    removeStorageSync.mockReset()
    getStorageSync.mockReset().mockReturnValue('stale-token')
  })

  it('clears the stale token, re-logs in silently and replays the request', async () => {
    request
      .mockResolvedValueOnce({ statusCode: 401, data: { error: 'unauthorized' } })
      .mockResolvedValueOnce({ statusCode: 200, data: { ok: true } })
    const { apiRequest } = await import('./apiClient')
    const { registerSessionRecovery } = await import('./sessionRecovery')
    const recover = vi.fn(() => Promise.resolve())
    registerSessionRecovery(recover)

    await expect(apiRequest('/api/session')).resolves.toEqual({ ok: true })

    expect(removeStorageSync).toHaveBeenCalledWith('pet10_access_token')
    expect(recover).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('surfaces the original error when the silent re-login fails', async () => {
    request.mockResolvedValue({ statusCode: 401, data: { error: 'unauthorized' } })
    const { apiRequest } = await import('./apiClient')
    const { registerSessionRecovery } = await import('./sessionRecovery')
    registerSessionRecovery(() => Promise.reject(new Error('wechat_exchange_failed')))

    await expect(apiRequest('/api/session')).rejects.toThrow('unauthorized')
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('replays only once when the retry is still rejected', async () => {
    request.mockResolvedValue({ statusCode: 401, data: { error: 'unauthorized' } })
    const { apiRequest } = await import('./apiClient')
    const { registerSessionRecovery } = await import('./sessionRecovery')
    registerSessionRecovery(() => Promise.resolve())

    await expect(apiRequest('/api/session')).rejects.toThrow('unauthorized')
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('does not try to recover the login request itself', async () => {
    request.mockResolvedValue({ statusCode: 401, data: { error: 'invalid_wechat_code' } })
    const { apiRequest } = await import('./apiClient')
    const { registerSessionRecovery } = await import('./sessionRecovery')
    const recover = vi.fn(() => Promise.resolve())
    registerSessionRecovery(recover)

    await expect(apiRequest('/api/auth/wechat', { auth: false })).rejects.toThrow('invalid_wechat_code')
    expect(recover).not.toHaveBeenCalled()
    expect(removeStorageSync).not.toHaveBeenCalled()
  })
})
