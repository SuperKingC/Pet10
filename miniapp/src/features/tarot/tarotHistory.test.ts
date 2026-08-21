import { beforeEach, describe, expect, it, vi } from 'vitest'

const getStorageSync = vi.fn()
const setStorageSync = vi.fn()

vi.mock('@tarojs/taro', () => ({
  default: {
    getStorageSync,
    setStorageSync,
  },
}))

describe('miniapp tarot history', () => {
  beforeEach(() => {
    getStorageSync.mockReset()
    setStorageSync.mockReset()
  })

  it('keeps the latest twenty readings', async () => {
    getStorageSync.mockReturnValue(Array.from({ length: 20 }, (_, index) => ({
      createdAt: String(index),
    })))
    const { saveTarotReading } = await import('./tarotHistory')
    const reading = { createdAt: 'new' }

    saveTarotReading(reading as never)

    expect(setStorageSync).toHaveBeenCalledWith(
      'pet10_tarot_history',
      expect.arrayContaining([reading]),
    )
    expect(setStorageSync.mock.calls[0][1]).toHaveLength(20)
    expect(setStorageSync.mock.calls[0][1][0]).toBe(reading)
  })
})
