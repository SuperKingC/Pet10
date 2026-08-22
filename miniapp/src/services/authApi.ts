import Taro from '@tarojs/taro'
import { apiRequest, setAccessToken } from './apiClient'

export const authApi = {
  async getWechatProfile() {
    const result = await Taro.getUserProfile({
      desc: '用于显示小窝内的头像和昵称',
    })

    return {
      displayName: result.userInfo.nickName,
      avatarUrl: result.userInfo.avatarUrl,
    }
  },

  async loginWithWechat(profile: { displayName?: string; avatarUrl?: string } = {}) {
    const loginResult = await Taro.login()
    const result = await apiRequest<{ token: string; user: { id: string; displayName: string; avatarUrl?: string | null } }>(
      '/api/auth/wechat',
      { method: 'POST', auth: false, body: { code: loginResult.code, profile } }
    )
    setAccessToken(result.token)
    return result.user
  }
}
