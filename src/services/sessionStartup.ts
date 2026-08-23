import { HttpError } from './httpClient'

export interface SessionStartupFailure {
  message: string
  clearToken: boolean
}

export function classifySessionStartupError(error: unknown): SessionStartupFailure {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return { message: '服务器响应超时，请检查网络后重试', clearToken: false }
  }
  if (error instanceof HttpError && (error.status === 401 || error.status === 403)) {
    return { message: error.message, clearToken: true }
  }
  if (error instanceof HttpError) {
    return { message: error.message, clearToken: false }
  }
  if (error instanceof TypeError) {
    return { message: '网络连接失败，请检查网络后重试', clearToken: false }
  }
  return {
    message: error instanceof Error ? error.message : '会话加载失败',
    clearToken: false,
  }
}
