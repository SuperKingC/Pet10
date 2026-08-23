import Taro from '@tarojs/taro'
import { apiRequest, setAccessToken } from './apiClient'

function readWechatAvatar(filePath: string) {
  return new Promise<string>((resolve, reject) => {
    Taro.getFileSystemManager().readFile({
      filePath,
      encoding: 'base64',
      success: (result) => resolve(`data:image/jpeg;base64,${result.data as string}`),
      fail: reject,
    })
  })
}

export const authApi = {
  async loginWithWechat(profile: { displayName?: string; avatarUrl?: string } = {}) {
    const loginResult = await Taro.login()
    const avatarUrl = profile.avatarUrl && !profile.avatarUrl.startsWith('http') && !profile.avatarUrl.startsWith('data:')
      ? await readWechatAvatar(profile.avatarUrl)
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
