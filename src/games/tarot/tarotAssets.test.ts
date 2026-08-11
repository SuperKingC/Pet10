import { describe, expect, it, vi } from 'vitest'
import { MAJOR_ARCANA } from './tarotDeck'
import {
  TAROT_ARTWORK,
  TAROT_ARTWORK_URLS,
  TAROT_CARD_BACK,
  TAROT_CRITICAL_RESOURCE_URLS,
  TAROT_SANCTUARY_BACKGROUND,
  preloadTarotArtwork
} from './tarotAssets'

describe('tarot artwork manifest', () => {
  it('maps every major arcana card to an optimized image', () => {
    expect(Object.keys(TAROT_ARTWORK)).toHaveLength(22)
    for (const card of MAJOR_ARCANA) {
      expect(TAROT_ARTWORK[card.id]).toMatch(/^\/tarot\/cards\/.+\.jpg$/)
    }
  })

  it('includes the sanctuary background and illustrated card back', () => {
    expect(TAROT_SANCTUARY_BACKGROUND).toBe('/tarot/ui/sanctuary-background.jpg')
    expect(TAROT_CARD_BACK).toBe('/tarot/ui/card-back.jpg')
  })

  it('keeps launcher-critical resources separate from card artwork', () => {
    expect(TAROT_CRITICAL_RESOURCE_URLS).toEqual([TAROT_SANCTUARY_BACKGROUND, TAROT_CARD_BACK])
    expect(TAROT_CRITICAL_RESOURCE_URLS).not.toEqual(expect.arrayContaining(TAROT_ARTWORK_URLS))
    expect(TAROT_CRITICAL_RESOURCE_URLS.join(' ')).not.toContain('/tarot/concepts/')
  })
})

describe('tarot artwork preloader', () => {
  it('reports progress after each image finishes', async () => {
    const progress: number[] = []
    const load = vi.fn(async () => undefined)

    await preloadTarotArtwork(['/a.jpg', '/b.jpg', '/c.jpg'], (value) => progress.push(value), load)

    expect(load).toHaveBeenCalledTimes(3)
    expect(progress).toEqual([1 / 3, 2 / 3, 1])
  })

  it('reports byte progress before an image finishes downloading', async () => {
    const progress: number[] = []
    const load = vi.fn(async (_url: string, onProgress?: (loaded: number, total?: number) => void) => {
      onProgress?.(25, 100)
      onProgress?.(75, 100)
    })

    await preloadTarotArtwork(['/a.jpg'], (value) => progress.push(value), load)

    expect(progress).toEqual([0.25, 0.75, 1])
  })

  it('never reports a lower percentage when a larger total becomes known', async () => {
    const progress: number[] = []
    const load = vi.fn(async (_url: string, onProgress?: (loaded: number, total?: number) => void) => {
      onProgress?.(80, 100)
      onProgress?.(80, 200)
    })

    await preloadTarotArtwork(['/a.jpg'], (value) => progress.push(value), load)

    expect(progress).toEqual([0.8, 0.8, 1])
  })

  it('keeps progressing when active resources do not expose content length', async () => {
    const progress: number[] = []
    const releases: Array<() => void> = []
    const load = vi.fn(async (_url: string, onProgress?: (loaded: number, total?: number) => void) => {
      onProgress?.(64 * 1024, undefined)
      await new Promise<void>((resolve) => { releases.push(resolve) })
      onProgress?.(128 * 1024, undefined)
    })

    const pending = preloadTarotArtwork(['/a.jpg', '/b.jpg'], (value) => progress.push(value), load, { concurrency: 2 })
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(2))

    expect(progress.some((value) => value > 0 && value < 1)).toBe(true)
    expect(progress.every((value) => value < 1)).toBe(true)
    releases.forEach((release) => release())
    await pending
    expect(progress.at(-1)).toBe(1)
  })

  it('rejects when an image cannot be downloaded', async () => {
    const load = vi.fn(async (url: string) => {
      if (url === '/broken.jpg') throw new Error('download failed')
    })

    await expect(preloadTarotArtwork(['/ok.jpg', '/broken.jpg'], () => undefined, load)).rejects.toThrow('download failed')
  })

  it('limits concurrent image downloads', async () => {
    let active = 0
    let maxActive = 0
    const releases: Array<() => void> = []
    const load = vi.fn(() => new Promise<void>((resolve) => {
      active += 1
      maxActive = Math.max(maxActive, active)
      releases.push(() => {
        active -= 1
        resolve()
      })
    }))

    const pending = preloadTarotArtwork(
      ['/1.jpg', '/2.jpg', '/3.jpg', '/4.jpg', '/5.jpg', '/6.jpg', '/7.jpg'],
      () => undefined,
      load
    )

    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(6))
    releases[0]?.()
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(7))
    releases[1]?.()
    releases.slice(2).forEach((release) => release())
    await pending

    expect(maxActive).toBe(6)
  })

  it('completes an empty preload list', async () => {
    const progress: number[] = []
    await preloadTarotArtwork([], (value) => progress.push(value))
    expect(progress).toEqual([1])
  })
})
