import { beforeEach, describe, expect, it, vi } from 'vitest'

const compressImage = vi.hoisted(() => vi.fn())
const readFileSync = vi.hoisted(() => vi.fn())

vi.mock('@tarojs/taro', () => ({
  default: {
    compressImage,
    getFileSystemManager: () => ({ readFileSync }),
  },
}))

const options = {
  widths: [1080, 720],
  maxChars: 300_000,
  oversizeMessage: '图片太大',
}

describe('compressImageToDataUrl', () => {
  beforeEach(() => {
    compressImage.mockReset()
    readFileSync.mockReset()
  })

  it('compresses at the first width and returns when within limit', async () => {
    compressImage.mockResolvedValue({ tempFilePath: 'wxfile://w1080' })
    readFileSync.mockReturnValue('x'.repeat(290_000))
    const { compressImageToDataUrl } = await import('./imageCompression')

    const result = await compressImageToDataUrl('wxfile://original', options)

    expect(result).toBe(`data:image/jpeg;base64,${'x'.repeat(290_000)}`)
    expect(compressImage).toHaveBeenCalledTimes(1)
    expect(compressImage).toHaveBeenCalledWith({ src: 'wxfile://original', quality: 80, compressedWidth: 1080 })
    expect(readFileSync).toHaveBeenCalledWith('wxfile://w1080', 'base64')
  })

  it('retries from the original at the next width instead of re-compressing', async () => {
    compressImage.mockResolvedValue({ tempFilePath: 'wxfile://out' })
    readFileSync
      .mockReturnValueOnce('x'.repeat(300_001))
      .mockReturnValueOnce('x'.repeat(299_000))
    const { compressImageToDataUrl } = await import('./imageCompression')

    const result = await compressImageToDataUrl('wxfile://original', options)

    expect(result).toBe(`data:image/jpeg;base64,${'x'.repeat(299_000)}`)
    expect(compressImage).toHaveBeenCalledTimes(2)
    expect(compressImage).toHaveBeenNthCalledWith(1, { src: 'wxfile://original', quality: 80, compressedWidth: 1080 })
    expect(compressImage).toHaveBeenNthCalledWith(2, { src: 'wxfile://original', quality: 80, compressedWidth: 720 })
  })

  it('never lowers quality below 80 to fit the budget', async () => {
    compressImage.mockResolvedValue({ tempFilePath: 'wxfile://out' })
    readFileSync.mockReturnValue('x'.repeat(300_001))
    const { compressImageToDataUrl } = await import('./imageCompression')

    await expect(compressImageToDataUrl('wxfile://original', options)).rejects.toThrow('图片太大')

    for (const call of compressImage.mock.calls) {
      expect(call[0].quality).toBe(80)
    }
  })

  it('falls back to the original file when compressImage is unavailable', async () => {
    compressImage.mockRejectedValue(new Error('not supported'))
    readFileSync.mockReturnValue('x'.repeat(100))
    const { compressImageToDataUrl } = await import('./imageCompression')

    await expect(compressImageToDataUrl('wxfile://original', options)).resolves.toBe('data:image/jpeg;base64,' + 'x'.repeat(100))
    expect(readFileSync).toHaveBeenCalledWith('wxfile://original', 'base64')
  })
})
