const assetBaseUrl = (
  typeof TARO_TAROT_ASSET_BASE_URL === 'string'
    ? TARO_TAROT_ASSET_BASE_URL
    : 'https://pet10kk.com'
).replace(/\/$/, '')

const artworkFiles = [
  'the-fool.jpg',
  'the-magician.jpg',
  'high-priestess.jpg',
  'the-empress.jpg',
  'the-emperor.jpg',
  'the-hierophant.jpg',
  'the-lovers.jpg',
  'the-chariot.jpg',
  'strength.jpg',
  'the-hermit.jpg',
  'wheel-of-fortune.jpg',
  'justice.jpg',
  'the-hanged-man.jpg',
  'death.jpg',
  'temperance.jpg',
  'the-devil.jpg',
  'the-tower.jpg',
  'the-star.jpg',
  'the-moon.jpg',
  'the-sun.jpg',
  'judgement.jpg',
  'the-world.jpg',
]

export const TAROT_SANCTUARY_BACKGROUND = `${assetBaseUrl}/tarot/ui/sanctuary-background.jpg`
export const TAROT_CARD_BACK = `${assetBaseUrl}/tarot/ui/card-back.jpg`

export function getTarotArtworkUrl(cardId: number): string {
  return `${assetBaseUrl}/tarot/cards/${artworkFiles[cardId] ?? artworkFiles[0]}`
}
