type Bucket = { minute: number; day: string; minuteCount: number; dayCount: number }

export type ImageRateLimiter = ReturnType<typeof createImageRateLimiter>
export type InviteFailureLimiter = ReturnType<typeof createInviteFailureLimiter>

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
    },
    /** 原子消耗 n 个额度（全有或全无），用于一次提交出多张图 */
    allowN(ip: string, n: number) {
      if (!Number.isInteger(n) || n < 1) return false
      const timestamp = now()
      const minute = Math.floor(timestamp / 60000)
      const day = new Date(timestamp).toISOString().slice(0, 10)
      const existing = buckets.get(ip)
      const bucket = existing && existing.minute === minute && existing.day === day
        ? existing
        : { minute, day, minuteCount: existing?.minute === minute ? existing.minuteCount : 0, dayCount: existing?.day === day ? existing.dayCount : 0 }
      if (bucket.minuteCount + n > config.perMinute || bucket.dayCount + n > config.perDay) return false
      bucket.minuteCount += n
      bucket.dayCount += n
      buckets.set(ip, bucket)
      return true
    },
    /** 查询剩余额度（不消耗额度，供额度展示接口使用） */
    peek(ip: string) {
      const timestamp = now()
      const minute = Math.floor(timestamp / 60000)
      const day = new Date(timestamp).toISOString().slice(0, 10)
      const existing = buckets.get(ip)
      const minuteUsed = existing && existing.minute === minute ? existing.minuteCount : 0
      const dayUsed = existing && existing.day === day ? existing.dayCount : 0
      return {
        minuteRemaining: Math.max(0, config.perMinute - minuteUsed),
        dayRemaining: Math.max(0, config.perDay - dayUsed)
      }
    }
  }
}

/** 邀请码失败锁定器：一天内错误满 maxPerDay 次，该 IP 当天全部拒绝（次日自动重置）。 */
export function createInviteFailureLimiter(config: { maxPerDay: number; now?: () => number }) {
  const failures = new Map<string, { day: string; count: number }>()
  return {
    recordFailure(ip: string) {
      const timestamp = config.now ?? Date.now
      const day = new Date(timestamp()).toISOString().slice(0, 10)
      const existing = failures.get(ip)
      const count = existing && existing.day === day ? existing.count + 1 : 1
      failures.set(ip, { day, count })
    },
    remaining(ip: string) {
      const timestamp = config.now ?? Date.now
      const day = new Date(timestamp()).toISOString().slice(0, 10)
      const existing = failures.get(ip)
      const used = existing && existing.day === day ? existing.count : 0
      return Math.max(0, config.maxPerDay - used)
    },
    isLocked(ip: string) {
      return this.remaining(ip) === 0
    }
  }
}
