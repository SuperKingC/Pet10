const assetBaseUrl = (
  typeof TARO_TAROT_ASSET_BASE_URL === 'string'
    ? TARO_TAROT_ASSET_BASE_URL
    : ''
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

export const TAROT_RESOURCE_URLS: string[] = [
  TAROT_SANCTUARY_BACKGROUND,
  TAROT_CARD_BACK,
  ...Array.from({ length: 22 }, (_, i) => getTarotArtworkUrl(i)),
]

export function getTarotArtworkUrl(cardId: number): string {
  return `${assetBaseUrl}/tarot/cards/${artworkFiles[cardId] ?? artworkFiles[0]}`
}

/**
 * 下载全部塔罗资源到本地缓存，供后续 <Image> 直接使用。
 * 使用并发 worker 模式，最多同时 4 个下载。
 */
export async function preloadTarotResources(
  onProgress: (progress: number) => void = () => undefined,
): Promise<void> {
  const urls = TAROT_RESOURCE_URLS
  if (urls.length === 0) {
    onProgress(1)
    return
  }

  // 动态导入避免在非小程序环境报错
  const Taro = await import('@tarojs/taro')
  let nextIndex = 0
  let completed = 0

  function downloadOne(url: string): Promise<void> {
    return Taro.downloadFile({ url })
      .then(() => undefined)
      .catch(() => undefined)
  }

  async function worker() {
    while (nextIndex < urls.length) {
      const url = urls[nextIndex]
      nextIndex++
      await downloadOne(url)
      completed++
      onProgress(completed / urls.length)
    }
  }

  const concurrency = Math.min(4, urls.length)
  await Promise.all(Array.from({ length: concurrency }, () => worker()))
  onProgress(1)
}
