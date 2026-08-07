// Badging API：不直接引用 Navigator 上的方法类型，避免新旧 TypeScript DOM 库定义冲突。
// 运行时按能力探测，不支持的浏览器静默跳过。
function getBadgeApi() {
  const nav = navigator as unknown as Record<string, unknown>
  const setFn = nav.setAppBadge
  const clearFn = nav.clearAppBadge
  return {
    setAppBadge:
      typeof setFn === 'function' ? (setFn as (count?: number) => Promise<void>).bind(navigator) : undefined,
    clearAppBadge: typeof clearFn === 'function' ? (clearFn as () => Promise<void>).bind(navigator) : undefined
  }
}

export function setAppBadge(count: number) {
  getBadgeApi().setAppBadge?.(count)?.catch(() => undefined)
}

export function clearAppBadge() {
  getBadgeApi().clearAppBadge?.()?.catch(() => undefined)
}
