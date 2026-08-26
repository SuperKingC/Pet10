import Taro from '@tarojs/taro'
import { apiRequest, setAccessToken } from './apiClient'
import { wechatAvatarToDataUrl } from './wechatProfileAssets'

export const authApi = {
  async loginWithWechat(profile: { displayName?: string; avatarUrl?: string } = {}) {
    const loginResult = await Taro.login()
    const avatarUrl = profile.avatarUrl
      ? await wechatAvatarToDataUrl(profile.avatarUrl)
      : profile.avatarUrl
    const confirmedProfile = avatarUrl ? { ...profile, avatarUrl } : profile
    const result = await apiRequest<{ token: string; user: { id: string; displayName: string; avatarUrl?: string | null } }>(
      '/api/auth/wechat',
      { method: 'POST', auth: false, body: { code: loginResult.code, profile: confirmedProfile } }
    )
    setAccessToken(result.token)
    return result.user
  }
}
