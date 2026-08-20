import Taro from '@tarojs/taro'

const tokenKey = 'pet10_access_token'
const apiBaseUrl = typeof TARO_API_BASE_URL === 'string' ? TARO_API_BASE_URL : ''

export function getAccessToken() {
  return Taro.getStorageSync<string>(tokenKey) || ''
}

export function setAccessToken(token: string) {
  Taro.setStorageSync(tokenKey, token)
}

export function clearAccessToken() {
  Taro.removeStorageSync(tokenKey)
}

export async function apiRequest<T>(path: string, options: {
  method?: 'GET' | 'POST'
  body?: Record<string, unknown>
  auth?: boolean
} = {}): Promise<T> {
  const response = await Taro.request<T>({
    url: `${apiBaseUrl}${path}`,
    method: options.method ?? 'GET',
    data: options.body,
    header: {
      'content-type': 'application/json',
      ...(options.auth !== false && getAccessToken()
        ? { authorization: `Bearer ${getAccessToken()}` }
        : {})
    }
  })
  if (response.statusCode < 200 || response.statusCode >= 300) {
    const body = response.data as unknown as { error?: string }
    throw new Error(body?.error || `request_failed:${response.statusCode}`)
  }
  return response.data
}
