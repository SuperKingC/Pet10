import { beforeEach, describe, expect, it, vi } from 'vitest'

const login = vi.hoisted(() => vi.fn())
const apiRequest = vi.hoisted(() => vi.fn())
const setAccessToken = vi.hoisted(() => vi.fn())
const readFile = vi.hoisted(() => vi.fn())

vi.mock('@tarojs/taro', () => ({
  default: {
    login,
    getFileSystemManager: () => ({ readFile }),
  },
}))

vi.mock('./apiClient', () => ({
  apiRequest,
  setAccessToken,
}))

describe('wechat auth api', () => {
  beforeEach(() => {
    login.mockReset()
    apiRequest.mockReset()
    setAccessToken.mockReset()
    readFile.mockReset()
  })

  it('converts a selected local avatar before sending the confirmed profile', async () => {
    login.mockResolvedValue({ code: 'wechat-code' })
    readFile.mockImplementation((options: { success(result: { data: string }): void }) => {
      options.success({ data: 'encoded-avatar' })
    })
    apiRequest.mockResolvedValue({
      token: 'session-token',
      user: {
        id: 'user-1',
        displayName: 'current-name',
        avatarUrl: 'data:image/jpeg;base64,encoded-avatar',
      },
    })

    const { authApi } = await import('./authApi')

    await authApi.loginWithWechat({
      displayName: 'current-name',
      avatarUrl: 'wxfile://current-avatar',
    })

    expect(readFile).toHaveBeenCalledWith(expect.objectContaining({
      filePath: 'wxfile://current-avatar',
      encoding: 'base64',
    }))
    expect(apiRequest).toHaveBeenCalledWith('/api/auth/wechat', {
      method: 'POST',
      auth: false,
      body: {
        code: 'wechat-code',
        profile: {
          displayName: 'current-name',
          avatarUrl: 'data:image/jpeg;base64,encoded-avatar',
        },
      },
    })
    expect(setAccessToken).toHaveBeenCalledWith('session-token')
  })
})
