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
export const TAROT_CRITICAL_RESOURCE_URLS = [TAROT_SANCTUARY_BACKGROUND, TAROT_CARD_BACK]
export const TAROT_RESOURCE_URLS = [...TAROT_ARTWORK_URLS, TAROT_SANCTUARY_BACKGROUND, TAROT_CARD_BACK]

type TarotAssetLoader = (url: string, onProgress?: ImageResourceProgress) => Promise<void>

export async function preloadTarotArtwork(
  urls: string[] = TAROT_RESOURCE_URLS,
  onProgress: (progress: number) => void = () => undefined,
  loader: TarotAssetLoader = loadImageResource,
  options: { concurrency?: number } = {}
): Promise<void> {
  if (urls.length === 0) {
    onProgress(1)
    return
  }

  let nextIndex = 0
  const loadedBytes = new Array<number>(urls.length).fill(0)
  const totalBytes = new Array<number | undefined>(urls.length).fill(undefined)
  const completedResources = new Array<boolean>(urls.length).fill(false)
  const concurrency = Math.max(1, Math.min(options.concurrency ?? 3, urls.length))

  function reportProgress() {
    const knownTotals = totalBytes.every((total): total is number => total !== undefined && total > 0)
    const progress = knownTotals
      ? loadedBytes.reduce((sum, value) => sum + value, 0) / totalBytes.reduce((sum, value) => sum + value, 0)
      : urls.reduce((sum, _url, index) => {
          if (completedResources[index]) return sum + 1
          const total = totalBytes[index]
          return sum + (total ? Math.min(1, loadedBytes[index] / total) : 0)
        }, 0) / urls.length
    onProgress(Math.min(1, progress))
  }

  async function worker() {
    while (nextIndex < urls.length) {
      const index = nextIndex
      nextIndex += 1
      const url = urls[index]
      try {
        await loader(url, (loaded, total) => {
          loadedBytes[index] = loaded
          totalBytes[index] = total
          reportProgress()
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        throw new Error(`${url}: ${message}`)
      }
      completedResources[index] = true
      if (totalBytes[index]) loadedBytes[index] = totalBytes[index]
      reportProgress()
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))
}
import { loadImageResource, type ImageResourceProgress } from '../../services/imageResourceLoader'
