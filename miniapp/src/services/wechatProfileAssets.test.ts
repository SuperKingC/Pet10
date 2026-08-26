import { beforeEach, describe, expect, it, vi } from 'vitest'

const compressImage = vi.hoisted(() => vi.fn())
const readFileSync = vi.hoisted(() => vi.fn())

vi.mock('@tarojs/taro', () => ({
  default: {
    compressImage,
    getFileSystemManager: () => ({ readFileSync }),
  },
}))

describe('wechat avatar conversion', () => {
  beforeEach(() => {
    compressImage.mockReset()
    readFileSync.mockReset()
  })

  it('returns remote and data urls untouched', async () => {
    const { wechatAvatarToDataUrl } = await import('./wechatProfileAssets')

    await expect(wechatAvatarToDataUrl('https://example.com/a.png')).resolves.toBe('https://example.com/a.png')
    await expect(wechatAvatarToDataUrl('data:image/png;base64,abc')).resolves.toBe('data:image/png;base64,abc')
    expect(compressImage).not.toHaveBeenCalled()
  })

  it('compresses a temp file and encodes it as a jpeg data url', async () => {
    compressImage.mockResolvedValue({ tempFilePath: 'wxfile://small' })
    readFileSync.mockReturnValue('encoded')
    const { wechatAvatarToDataUrl } = await import('./wechatProfileAssets')

    await expect(wechatAvatarToDataUrl('wxfile://original')).resolves.toBe('data:image/jpeg;base64,encoded')
    expect(readFileSync).toHaveBeenCalledWith('wxfile://small', 'base64')
  })

  it('falls back to the original file when compression fails', async () => {
    compressImage.mockRejectedValue(new Error('compress_failed'))
    readFileSync.mockReturnValue('encoded')
    const { wechatAvatarToDataUrl } = await import('./wechatProfileAssets')

    await expect(wechatAvatarToDataUrl('wxfile://original')).resolves.toBe('data:image/jpeg;base64,encoded')
    expect(readFileSync).toHaveBeenCalledWith('wxfile://original', 'base64')
  })

  it('rejects an avatar that exceeds the server payload limit', async () => {
    compressImage.mockResolvedValue({ tempFilePath: 'wxfile://big' })
    readFileSync.mockReturnValue('x'.repeat(700_001))
    const { wechatAvatarToDataUrl } = await import('./wechatProfileAssets')

    await expect(wechatAvatarToDataUrl('wxfile://original')).rejects.toThrow('头像太大')
  })
})
