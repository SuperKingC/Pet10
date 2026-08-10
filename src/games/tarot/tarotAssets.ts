export const TAROT_ARTWORK: Record<number, string> = {
  0: '/tarot/cards/the-fool.jpg',
  1: '/tarot/cards/the-magician.jpg',
  2: '/tarot/cards/high-priestess.jpg',
  3: '/tarot/cards/the-empress.jpg',
  4: '/tarot/cards/the-emperor.jpg',
  5: '/tarot/cards/the-hierophant.jpg',
  6: '/tarot/cards/the-lovers.jpg',
  7: '/tarot/cards/the-chariot.jpg',
  8: '/tarot/cards/strength.jpg',
  9: '/tarot/cards/the-hermit.jpg',
  10: '/tarot/cards/wheel-of-fortune.jpg',
  11: '/tarot/cards/justice.jpg',
  12: '/tarot/cards/the-hanged-man.jpg',
  13: '/tarot/cards/death.jpg',
  14: '/tarot/cards/temperance.jpg',
  15: '/tarot/cards/the-devil.jpg',
  16: '/tarot/cards/the-tower.jpg',
  17: '/tarot/cards/the-star.jpg',
  18: '/tarot/cards/the-moon.jpg',
  19: '/tarot/cards/the-sun.jpg',
  20: '/tarot/cards/judgement.jpg',
  21: '/tarot/cards/the-world.jpg'
}

export const TAROT_ARTWORK_URLS = Object.values(TAROT_ARTWORK)
export const TAROT_SANCTUARY_BACKGROUND = '/tarot/ui/sanctuary-background.jpg'
export const TAROT_CARD_BACK = '/tarot/ui/card-back.jpg'
export const TAROT_RESOURCE_URLS = [...TAROT_ARTWORK_URLS, TAROT_SANCTUARY_BACKGROUND, TAROT_CARD_BACK]

function loadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve()
    image.onerror = () => reject(new Error(`塔罗资源下载失败：${url}`))
    image.src = url
  })
}

export async function preloadTarotArtwork(
  urls: string[] = TAROT_RESOURCE_URLS,
  onProgress: (progress: number) => void = () => undefined,
  loader: (url: string) => Promise<void> = loadImage
): Promise<void> {
  let completed = 0
  for (const url of urls) {
    await loader(url)
    completed += 1
    onProgress(completed / urls.length)
  }
}
