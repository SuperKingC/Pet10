import { apiRequest, setAccessToken } from './apiClient'

export const authApi = {
  requestCode(email: string, inviteCode: string) {
    return apiRequest<{ expiresInSeconds: number; developmentCode?: string }>('/api/auth/request-code', {
      method: 'POST', auth: false, body: { email, inviteCode }
    })
  },
  async verifyCode(email: string, code: string) {
    const result = await apiRequest<{ token: string; user: { id: string; email: string; displayName: string } }>(
      '/api/auth/verify-code', { method: 'POST', auth: false, body: { email, code } }
    )
    setAccessToken(result.token)
    return result.user
  }
}
