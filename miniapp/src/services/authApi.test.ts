import { beforeEach, describe, expect, it, vi } from 'vitest'

const login = vi.hoisted(() => vi.fn())
const apiRequest = vi.hoisted(() => vi.fn())
const setAccessToken = vi.hoisted(() => vi.fn())
const readFileSync = vi.hoisted(() => vi.fn())
const compressImage = vi.hoisted(() => vi.fn())

vi.mock('@tarojs/taro', () => ({
  default: {
    login,
    compressImage,
    getFileSystemManager: () => ({ readFileSync }),
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
    readFileSync.mockReset()
    compressImage.mockReset()
  })

  it('converts a selected local avatar before sending the confirmed profile', async () => {
    login.mockResolvedValue({ code: 'wechat-code' })
    compressImage.mockResolvedValue({ tempFilePath: 'wxfile://compressed-avatar' })
    readFileSync.mockReturnValue('encoded-avatar')
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

    expect(compressImage).toHaveBeenCalledWith({ src: 'wxfile://current-avatar', quality: 80, compressedWidth: 640 })
    expect(readFileSync).toHaveBeenCalledWith('wxfile://compressed-avatar', 'base64')
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
