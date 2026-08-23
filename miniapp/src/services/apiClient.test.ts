import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.hoisted(() => vi.fn())
const getStorageSync = vi.hoisted(() => vi.fn())

vi.mock('@tarojs/taro', () => ({
  default: {
    request,
    getStorageSync,
    setStorageSync: vi.fn(),
    removeStorageSync: vi.fn(),
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
