import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startSingleFlightPolling } from './singleFlightPolling'

describe('startSingleFlightPolling', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('waits for the current task to settle before scheduling the next interval', async () => {
    let resolveTask!: () => void
    const task = vi.fn(() => new Promise<void>((resolve) => { resolveTask = resolve }))

    const stop = startSingleFlightPolling(task, 1_000)

    expect(task).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(5_000)
    expect(task).toHaveBeenCalledTimes(1)

    resolveTask()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(999)
    expect(task).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(task).toHaveBeenCalledTimes(2)
    stop()
  })

  it('invalidates the active task and prevents future runs after stop', async () => {
    let isCurrent!: () => boolean
    const task = vi.fn(async (current: () => boolean) => { isCurrent = current })

    const stop = startSingleFlightPolling(task, 1_000)
    await Promise.resolve()
    expect(isCurrent()).toBe(true)

    stop()
    expect(isCurrent()).toBe(false)
    await vi.advanceTimersByTimeAsync(5_000)
    expect(task).toHaveBeenCalledTimes(1)
  })
})
