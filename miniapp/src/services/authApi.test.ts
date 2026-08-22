import { beforeEach, describe, expect, it, vi } from 'vitest'

const getUserProfile = vi.hoisted(() => vi.fn())

vi.mock('@tarojs/taro', () => ({
  default: { getUserProfile },
}))

vi.mock('./apiClient', () => ({
  setAccessToken: vi.fn(),
}))

describe('wechat auth api', () => {
  beforeEach(() => {
    getUserProfile.mockReset()
  })

  it('reads and maps the confirmed WeChat profile without exposing edit controls', async () => {
    getUserProfile.mockResolvedValue({
      userInfo: {
        nickName: '微信昵称',
        avatarUrl: 'https://wx.example/avatar.png',
      },
    })

    const { authApi } = await import('./authApi')

    await expect(authApi.getWechatProfile()).resolves.toEqual({
      displayName: '微信昵称',
      avatarUrl: 'https://wx.example/avatar.png',
    })
    expect(getUserProfile).toHaveBeenCalledWith({
      desc: '用于显示小窝内的头像和昵称',
    })
  })
})
