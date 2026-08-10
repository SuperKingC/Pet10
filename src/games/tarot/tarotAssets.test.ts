import { describe, expect, it, vi } from 'vitest'
import { MAJOR_ARCANA } from './tarotDeck'
import { TAROT_ARTWORK, TAROT_CARD_BACK, TAROT_SANCTUARY_BACKGROUND, preloadTarotArtwork } from './tarotAssets'

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
})
