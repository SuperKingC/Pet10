import { beforeEach, describe, expect, it, vi } from 'vitest'
import { recoverSession, registerSessionRecovery } from './sessionRecovery'

describe('session recovery registry', () => {
  beforeEach(() => {
    registerSessionRecovery(null)
  })

  it('reports failure when no handler is registered', async () => {
    await expect(recoverSession()).resolves.toBe(false)
  })

  it('reports success after the handler resolves', async () => {
    registerSessionRecovery(() => Promise.resolve())

    await expect(recoverSession()).resolves.toBe(true)
  })

  it('reports failure instead of throwing when the handler rejects', async () => {
    registerSessionRecovery(() => Promise.reject(new Error('login_failed')))

    await expect(recoverSession()).resolves.toBe(false)
  })

  it('shares one recovery across concurrent callers', async () => {
    let resolveLogin: () => void = () => undefined
    const handler = vi.fn(() => new Promise<void>((resolve) => { resolveLogin = resolve }))
    registerSessionRecovery(handler)

    const first = recoverSession()
    const second = recoverSession()
    resolveLogin()

    await expect(Promise.all([first, second])).resolves.toEqual([true, true])
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('allows a fresh recovery after the previous one settled', async () => {
    const handler = vi.fn(() => Promise.resolve())
    registerSessionRecovery(handler)

    await recoverSession()
    await recoverSession()

    expect(handler).toHaveBeenCalledTimes(2)
  })
})
