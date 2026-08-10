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
      ['/1.jpg', '/2.jpg', '/3.jpg', '/4.jpg', '/5.jpg'],
      () => undefined,
      load,
      { concurrency: 3 }
    )

    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(3))
    releases[0]?.()
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(4))
    releases[1]?.()
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(5))
    releases.slice(2).forEach((release) => release())
    await pending

    expect(maxActive).toBe(3)
  })

  it('completes an empty preload list', async () => {
    const progress: number[] = []
    await preloadTarotArtwork([], (value) => progress.push(value))
    expect(progress).toEqual([1])
  })
})
