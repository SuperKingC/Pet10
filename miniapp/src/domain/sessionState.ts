export function hasAuthenticatedSession(token: string) {
  return Boolean(token)
}

/**
 * 令牌签名有效但服务端已查不到该用户（典型场景：用户在其他设备注销了账号）。
 * 服务端对此返回 404 user_not_found，不会触发 401 静默重登，客户端需自行退回登录页。
 */
export function isAccountMissingError(error: unknown) {
  return error instanceof Error && error.message === 'user_not_found'
}
