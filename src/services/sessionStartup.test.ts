import { describe, expect, it } from 'vitest'
import { HttpError } from './httpClient'
import { classifySessionStartupError } from './sessionStartup'

describe('classifySessionStartupError', () => {
  it('clears the token only for an explicit unauthorized response', () => {
    expect(classifySessionStartupError(new HttpError('expired', 401))).toEqual({
      message: 'expired',
      clearToken: true,
    })
    expect(classifySessionStartupError(new HttpError('forbidden', 403))).toEqual({
      message: 'forbidden',
      clearToken: true,
    })
  })

  it('keeps the token for server failures', () => {
    expect(classifySessionStartupError(new HttpError('temporary failure', 503))).toEqual({
      message: 'temporary failure',
      clearToken: false,
    })
  })

  it('keeps the token and uses the existing timeout message for aborts', () => {
    expect(classifySessionStartupError(new DOMException('aborted', 'AbortError'))).toEqual({
      message: '服务器响应超时，请检查网络后重试',
      clearToken: false,
    })
  })

  it('keeps the token for network errors', () => {
    expect(classifySessionStartupError(new TypeError('Failed to fetch'))).toEqual({
      message: '网络连接失败，请检查网络后重试',
      clearToken: false,
    })
  })
})
