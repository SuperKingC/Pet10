import { afterEach, describe, expect, it, vi } from 'vitest'
import { dataUrlBytes, prepareReferenceImage } from './imageReference'

describe('image reference helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('calculates decoded bytes from padded base64 data URLs', () => {
    expect(dataUrlBytes('data:image/jpeg;base64,aGVsbG8=')).toBe(5)
  })

  it('resizes and compresses a supported reference image within the service boundary', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({
      width: 4096,
      height: 2048,
      close: vi.fn(),
    })))
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,aGVsbG8=')

    await expect(prepareReferenceImage(new File(['image'], 'reference.png', { type: 'image/png' }))).resolves.toEqual({
      name: 'reference.png',
      dataUrl: 'data:image/jpeg;base64,aGVsbG8=',
      bytes: 5,
    })
  })
})
