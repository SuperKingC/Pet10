// 令牌失效后的静默重登注册表。
// apiClient 不能直接依赖 authApi（authApi 已依赖 apiClient），用注册表打破循环。

let handler: (() => Promise<void>) | null = null
let inFlight: Promise<void> | null = null

export function registerSessionRecovery(next: (() => Promise<void>) | null) {
  handler = next
}

/** 并发 401 只触发一次静默重登，其余请求等同一个 Promise。 */
export function recoverSession(): Promise<boolean> {
  if (!handler) return Promise.resolve(false)
  if (!inFlight) {
    inFlight = handler().finally(() => {
      inFlight = null
    })
  }
  return inFlight.then(() => true, () => false)
}
