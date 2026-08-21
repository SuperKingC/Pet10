import { beforeEach, describe, expect, it, vi } from 'vitest'

const { hideToast, showToast } = vi.hoisted(() => ({
  hideToast: vi.fn(),
  showToast: vi.fn(),
}))

vi.mock('@tarojs/taro', () => ({
  default: {
    hideToast,
    showToast,
  },
}))

describe('feedback queue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    hideToast.mockReset()
    showToast.mockReset()
  })

  it('shows queued info messages one at a time for one second', async () => {
    const { showInfo } = await import('./feedback')
    const first = showInfo('第一条提示')
    const second = showInfo('第二条提示')
    await Promise.resolve()

    expect(showToast).toHaveBeenCalledTimes(1)
    expect(showToast).toHaveBeenLastCalledWith({
      title: '第一条提示',
      icon: 'none',
      duration: 1000,
    })

    await vi.advanceTimersByTimeAsync(1000)
    await first

    expect(showToast).toHaveBeenCalledTimes(2)
    expect(showToast).toHaveBeenLastCalledWith({
      title: '第二条提示',
      icon: 'none',
      duration: 1000,
    })

    await vi.advanceTimersByTimeAsync(1000)
    await second
  })
})
