import { describe, expect, it, vi } from 'vitest'
import { mountFortuneHistory } from './fortuneHistory'

describe('fortune detail history', () => {
  it('closes the detail when the browser or device goes back', () => {
    const onBack = vi.fn()
    const cleanup = mountFortuneHistory(onBack)

    window.dispatchEvent(new PopStateEvent('popstate'))

    expect(onBack).toHaveBeenCalledOnce()
    cleanup()
  })
})
