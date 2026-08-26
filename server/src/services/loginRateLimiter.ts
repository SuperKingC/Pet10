type Bucket = { minute: number; count: number }

/**
 * 微信登录是唯一的匿名可打接口，按 IP 做固定窗口限流。
 * 与 imageRateLimiter 分开：这里只有分钟维度，没有按天配额。
 */
export function createLoginRateLimiter(config: { perMinute: number; now?: () => number }) {
  const buckets = new Map<string, Bucket>()
  const now = config.now ?? Date.now
  return {
    allow(ip: string) {
      const minute = Math.floor(now() / 60000)
      const existing = buckets.get(ip)
      const bucket = existing && existing.minute === minute ? existing : { minute, count: 0 }
      if (bucket.count >= config.perMinute) return false
      bucket.count += 1
      buckets.set(ip, bucket)
      return true
    }
  }
}
