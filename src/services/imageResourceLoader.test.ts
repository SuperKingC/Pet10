import { afterEach, describe, expect, it, vi } from 'vitest'
import { decodeImageResource, loadImageResource, preloadImage } from './imageResourceLoader'

describe('loadImageResource', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reports streamed bytes without decoding the downloaded image', async () => {
    const imageConstructor = vi.fn()
    const progress: Array<[number, number | undefined]> = []
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]))
        controller.enqueue(new Uint8Array([3, 4, 5]))
        controller.close()
      }
    })

    vi.stubGlobal('Image', imageConstructor)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, {
      status: 200,
      headers: { 'content-length': '5' }
    })))

    await loadImageResource('https://assets.example.com/tarot/cards/the-world.jpg', (loaded, total) => {
      progress.push([loaded, total])
    })

    expect(progress).toEqual([[2, 5], [5, 5], [5, 5]])
    expect(imageConstructor).not.toHaveBeenCalled()
  })

  it('waits until the browser decodes an image resource', async () => {
    const decode = vi.fn(async () => undefined)
    const image = {
      decoding: 'auto',
      src: '',
      decode
    }
    vi.stubGlobal('Image', vi.fn(() => image))

    await decodeImageResource('/tarot/cards/the-world.jpg')

    expect(image.decoding).toBe('async')
    expect(image.src).toBe('/tarot/cards/the-world.jpg')
    expect(decode).toHaveBeenCalledOnce()
  })

  it('starts non-blocking image decoding for critical interface artwork', async () => {
    const decode = vi.fn(async () => undefined)
    const image = {
      decoding: 'auto',
      loading: 'lazy',
      src: '',
      decode
    }
    vi.stubGlobal('Image', vi.fn(() => image))

    preloadImage('/pet/xiaoduoli.png')
    await Promise.resolve()

    expect(image.decoding).toBe('async')
    expect(image.loading).toBe('eager')
    expect(image.src).toBe('/pet/xiaoduoli.png')
    expect(decode).toHaveBeenCalledOnce()
  })
})
