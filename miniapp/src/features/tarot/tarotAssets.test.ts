import { describe, expect, it, vi } from 'vitest'

// URL 构建经 assetBaseUrl 读宿主平台；node 环境静态导入 @tarojs/taro 会崩，统一 mock 掉
vi.mock('@tarojs/taro', () => ({
  default: { getSystemInfoSync: () => ({ platform: 'devtools' }) },
}))

import {
  getTarotCardBack,
  getTarotResourceUrls,
  getTarotSanctuaryBackground,
  getTarotArtworkUrl,
  preloadTarotResources,
} from './tarotAssets'

describe('miniapp tarot assets', () => {
  it('builds tarot URLs under the /tarot path of the resolved asset base', () => {
    expect(getTarotCardBack()).toContain('/tarot/ui/card-back.jpg')
    expect(getTarotSanctuaryBackground()).toContain('/tarot/ui/sanctuary-background.jpg')
    expect(getTarotArtworkUrl(0)).toContain('/tarot/cards/the-fool.jpg')
    expect(getTarotArtworkUrl(21)).toContain('/tarot/cards/the-world.jpg')
  })

  it('falls back to the first artwork for unknown card ids', () => {
    expect(getTarotArtworkUrl(99)).toContain('/tarot/cards/the-fool.jpg')
  })

  it('lists all 24 tarot resource URLs for preloading', () => {
    const urls = getTarotResourceUrls()
    expect(urls).toHaveLength(24)
    expect(urls[0]).toContain('sanctuary-background.jpg')
    expect(urls[1]).toContain('card-back.jpg')
    expect(urls[2]).toContain('the-fool.jpg')
    expect(urls[23]).toContain('the-world.jpg')
  })

  it('exports preloadTarotResources as an async function', () => {
    expect(typeof preloadTarotResources).toBe('function')
  })
})
