import { apiRequest, setAccessToken } from './httpClient'

export interface AuthUser {
  id: string
  email: string
  username: string
  displayName: string
}

export const authApi = {
  requestCode(email: string, inviteCode: string) {
    return apiRequest<{ expiresInSeconds: number; developmentCode?: string }>('/api/auth/request-code', {
      method: 'POST',
      body: JSON.stringify({ email, inviteCode })
    })
  },
  async verifyCode(email: string, code: string) {
    const result = await apiRequest<{ token: string; user: AuthUser }>('/api/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ email, code })
    })
    setAccessToken(result.token)
    return result.user
  }
}
