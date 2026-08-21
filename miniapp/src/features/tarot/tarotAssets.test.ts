import { describe, expect, it } from 'vitest'
import {
  TAROT_CARD_BACK,
  TAROT_SANCTUARY_BACKGROUND,
  getTarotArtworkUrl,
} from './tarotAssets'

describe('miniapp tarot assets', () => {
  it('uses the configured production base for the PWA tarot resources', () => {
    expect(TAROT_CARD_BACK).toContain('/tarot/ui/card-back.jpg')
    expect(TAROT_SANCTUARY_BACKGROUND).toContain('/tarot/ui/sanctuary-background.jpg')
    expect(getTarotArtworkUrl(0)).toContain('/tarot/cards/the-fool.jpg')
    expect(getTarotArtworkUrl(21)).toContain('/tarot/cards/the-world.jpg')
  })
})
