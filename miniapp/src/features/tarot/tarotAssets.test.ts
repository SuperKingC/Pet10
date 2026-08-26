import { describe, expect, it } from 'vitest'
import {
  TAROT_CARD_BACK,
  TAROT_RESOURCE_URLS,
  TAROT_SANCTUARY_BACKGROUND,
  getTarotArtworkUrl,
  preloadTarotResources,
} from './tarotAssets'

describe('miniapp tarot assets', () => {
  it('uses the build-time COS base for tarot resources', () => {
    expect(TAROT_CARD_BACK).toContain('/tarot/ui/card-back.jpg')
    expect(TAROT_SANCTUARY_BACKGROUND).toContain('/tarot/ui/sanctuary-background.jpg')
    expect(getTarotArtworkUrl(0)).toContain('/tarot/cards/the-fool.jpg')
    expect(getTarotArtworkUrl(21)).toContain('/tarot/cards/the-world.jpg')
  })

  it('lists all 24 tarot resource URLs for preloading', () => {
    expect(TAROT_RESOURCE_URLS).toHaveLength(24)
    expect(TAROT_RESOURCE_URLS[0]).toContain('sanctuary-background.jpg')
    expect(TAROT_RESOURCE_URLS[1]).toContain('card-back.jpg')
    expect(TAROT_RESOURCE_URLS[2]).toContain('the-fool.jpg')
    expect(TAROT_RESOURCE_URLS[23]).toContain('the-world.jpg')
  })

  it('exports preloadTarotResources as an async function', () => {
    expect(typeof preloadTarotResources).toBe('function')
  })
})
