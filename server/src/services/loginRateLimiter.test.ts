import { describe, expect, it } from 'vitest'
import { createLoginRateLimiter } from './loginRateLimiter.js'

describe('login rate limiter', () => {
  it('allows requests up to the per-minute quota', () => {
    const limiter = createLoginRateLimiter({ perMinute: 3, now: () => 0 })

    expect([limiter.allow('1.1.1.1'), limiter.allow('1.1.1.1'), limiter.allow('1.1.1.1')]).toEqual([true, true, true])
    expect(limiter.allow('1.1.1.1')).toBe(false)
  })

  it('tracks each client address separately', () => {
    const limiter = createLoginRateLimiter({ perMinute: 1, now: () => 0 })

    expect(limiter.allow('1.1.1.1')).toBe(true)
    expect(limiter.allow('1.1.1.1')).toBe(false)
    expect(limiter.allow('2.2.2.2')).toBe(true)
  })

  it('resets the quota in the next minute', () => {
    let timestamp = 0
    const limiter = createLoginRateLimiter({ perMinute: 1, now: () => timestamp })

    expect(limiter.allow('1.1.1.1')).toBe(true)
    expect(limiter.allow('1.1.1.1')).toBe(false)

    timestamp = 60_000
    expect(limiter.allow('1.1.1.1')).toBe(true)
  })
})
