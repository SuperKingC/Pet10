import { runtimeConfig } from './runtimeConfig'

const TOKEN_KEY = 'pet10_access_token'

export function getAccessToken() {
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setAccessToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token)
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken()
  const response = await fetch(`${runtimeConfig.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers
    }
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'request_failed' })) as { error?: string }
    throw new Error(body.error || `request_failed:${response.status}`)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
