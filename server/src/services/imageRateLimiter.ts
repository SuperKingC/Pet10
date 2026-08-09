type Bucket = { minute: number; day: string; minuteCount: number; dayCount: number }

export function createImageRateLimiter(config: { perMinute: number; perDay: number; now?: () => number }) {
  const buckets = new Map<string, Bucket>()
  const now = config.now ?? Date.now
  return {
    allow(ip: string) {
      const timestamp = now()
      const minute = Math.floor(timestamp / 60000)
      const day = new Date(timestamp).toISOString().slice(0, 10)
      const existing = buckets.get(ip)
      const bucket = existing && existing.minute === minute && existing.day === day
        ? existing
        : { minute, day, minuteCount: existing?.minute === minute ? existing.minuteCount : 0, dayCount: existing?.day === day ? existing.dayCount : 0 }
      if (bucket.minuteCount >= config.perMinute || bucket.dayCount >= config.perDay) return false
      bucket.minuteCount += 1
      bucket.dayCount += 1
      buckets.set(ip, bucket)
      return true
    }
  }
}
