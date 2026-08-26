import Taro from '@tarojs/taro'
import { recoverSession } from './sessionRecovery'

const tokenKey = 'pet10_access_token'

export const DEFAULT_REQUEST_TIMEOUT_MS = 15_000
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

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  timeoutMs?: number
  body?: Record<string, unknown>
  auth?: boolean
}

function send<T>(path: string, options: ApiRequestOptions) {
  return Taro.request<T>({
    url: `${apiBaseUrl}${path}`,
    timeout: options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
    method: options.method ?? 'GET',
    data: options.body,
    header: {
      'content-type': 'application/json',
      ...(options.auth !== false && getAccessToken()
        ? { authorization: `Bearer ${getAccessToken()}` }
        : {})
    }
  })
}

function isSuccess(statusCode: number) {
  return statusCode >= 200 && statusCode < 300
}

function toError(response: { statusCode: number; data: unknown }) {
  const body = response.data as { error?: string } | undefined
  return new Error(body?.error || `request_failed:${response.statusCode}`)
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const response = await send<T>(path, options)
  if (isSuccess(response.statusCode)) return response.data

  // 令牌失效：清掉它，静默重登一次，再重放本次请求。
  // 只重放一次，避免服务端持续 401 时无限递归。
  if (response.statusCode === 401 && options.auth !== false) {
    clearAccessToken()
    if (await recoverSession()) {
      const retried = await send<T>(path, options)
      if (isSuccess(retried.statusCode)) return retried.data
      throw toError(retried)
    }
  }
  throw toError(response)
}
