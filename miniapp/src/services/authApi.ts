import Taro from '@tarojs/taro'
import { apiRequest, setAccessToken } from './apiClient'

export const authApi = {
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
