import {
  decodeImageResource,
  loadImageResource,
  type ImageResourceProgress
} from '../../services/imageResourceLoader'
import { runtimeConfig } from '../../services/runtimeConfig'

export function resolveTarotAssetUrl(path: string, baseUrl = runtimeConfig.tarotAssetBaseUrl): string {
  if (!baseUrl) return path
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

export const TAROT_ARTWORK: Record<number, string> = {
  0: resolveTarotAssetUrl('/tarot/cards/the-fool.jpg'),
  1: resolveTarotAssetUrl('/tarot/cards/the-magician.jpg'),
  2: resolveTarotAssetUrl('/tarot/cards/high-priestess.jpg'),
  3: resolveTarotAssetUrl('/tarot/cards/the-empress.jpg'),
  4: resolveTarotAssetUrl('/tarot/cards/the-emperor.jpg'),
  5: resolveTarotAssetUrl('/tarot/cards/the-hierophant.jpg'),
  6: resolveTarotAssetUrl('/tarot/cards/the-lovers.jpg'),
  7: resolveTarotAssetUrl('/tarot/cards/the-chariot.jpg'),
  8: resolveTarotAssetUrl('/tarot/cards/strength.jpg'),
  9: resolveTarotAssetUrl('/tarot/cards/the-hermit.jpg'),
  10: resolveTarotAssetUrl('/tarot/cards/wheel-of-fortune.jpg'),
  11: resolveTarotAssetUrl('/tarot/cards/justice.jpg'),
  12: resolveTarotAssetUrl('/tarot/cards/the-hanged-man.jpg'),
  13: resolveTarotAssetUrl('/tarot/cards/death.jpg'),
  14: resolveTarotAssetUrl('/tarot/cards/temperance.jpg'),
  15: resolveTarotAssetUrl('/tarot/cards/the-devil.jpg'),
  16: resolveTarotAssetUrl('/tarot/cards/the-tower.jpg'),
  17: resolveTarotAssetUrl('/tarot/cards/the-star.jpg'),
  18: resolveTarotAssetUrl('/tarot/cards/the-moon.jpg'),
  19: resolveTarotAssetUrl('/tarot/cards/the-sun.jpg'),
  20: resolveTarotAssetUrl('/tarot/cards/judgement.jpg'),
  21: resolveTarotAssetUrl('/tarot/cards/the-world.jpg')
}

export const TAROT_ARTWORK_URLS = Object.values(TAROT_ARTWORK)
export const TAROT_SANCTUARY_BACKGROUND = resolveTarotAssetUrl('/tarot/ui/sanctuary-background.jpg')
export const TAROT_CARD_BACK = resolveTarotAssetUrl('/tarot/ui/card-back.jpg')
export const TAROT_CRITICAL_RESOURCE_URLS = [TAROT_SANCTUARY_BACKGROUND, TAROT_CARD_BACK]
export const TAROT_RESOURCE_URLS = [...TAROT_ARTWORK_URLS, TAROT_SANCTUARY_BACKGROUND, TAROT_CARD_BACK]
const TAROT_ESTIMATED_RESOURCE_BYTES = 5_118_840 / TAROT_RESOURCE_URLS.length

type TarotAssetLoader = (url: string, onProgress?: ImageResourceProgress) => Promise<void>
type TarotAssetDecoder = (url: string) => Promise<void>

export async function preloadTarotArtwork(
  urls: string[] = TAROT_RESOURCE_URLS,
  onProgress: (progress: number) => void = () => undefined,
  loader: TarotAssetLoader = loadImageResource,
  options: { concurrency?: number; decoder?: TarotAssetDecoder } = {}
): Promise<void> {
  if (urls.length === 0) {
    onProgress(1)
    return
  }

  let nextIndex = 0
  const loadedBytes = new Array<number>(urls.length).fill(0)
  const totalBytes = new Array<number | undefined>(urls.length).fill(undefined)
  const completedResources = new Array<boolean>(urls.length).fill(false)
  const concurrency = Math.max(1, Math.min(options.concurrency ?? 6, urls.length))
  let lastProgress = 0

  function reportProgress() {
    const completed = completedResources.every(Boolean)
    if (completed) return

    const loadedTotal = loadedBytes.reduce<number>((sum, value, index) => (
      sum + Math.min(value, totalBytes[index] ?? TAROT_ESTIMATED_RESOURCE_BYTES)
    ), 0)
    const estimatedTotal = totalBytes.reduce<number>(
      (sum, total) => sum + (total && total > 0 ? total : TAROT_ESTIMATED_RESOURCE_BYTES),
      0
    )
    const progress = Math.min(0.99, loadedTotal / estimatedTotal)
    lastProgress = Math.max(lastProgress, progress)
    onProgress(lastProgress)
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
      loadedBytes[index] = totalBytes[index] ?? TAROT_ESTIMATED_RESOURCE_BYTES
      reportProgress()
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))

  let nextDecodeIndex = 0
  const decoder = options.decoder ?? decodeImageResource

  async function decodeWorker() {
    while (nextDecodeIndex < urls.length) {
      const url = urls[nextDecodeIndex]
      nextDecodeIndex += 1
      try {
        await decoder(url)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        throw new Error(`${url}: ${message}`)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(2, urls.length) }, () => decodeWorker()))
  onProgress(1)
}
