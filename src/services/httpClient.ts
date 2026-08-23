import { runtimeConfig } from './runtimeConfig'

const TOKEN_KEY = 'pet10_access_token'

export class HttpError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

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
    throw new HttpError(body.error || `request_failed:${response.status}`, response.status)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
