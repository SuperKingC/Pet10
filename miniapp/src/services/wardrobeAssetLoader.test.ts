import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSuitAssetService, type SuitAssetDeps } from './wardrobeAssetLoader'

function makeDeps(overrides: Partial<SuitAssetDeps> = {}): SuitAssetDeps {
  const index: Record<string, string> = {}
  return {
    bundledImages: {
      default: 'bundled-default.png',
      'outfit-scarf-v1.png': 'bundled-scarf.png',
      'outfit-hat-v1.png': 'bundled-hat.png',
      'outfit-bag-v1.png': 'bundled-bag.png'
    },
    readIndex: () => index,
    writeIndex: (next) => Object.assign(index, next),
    userdataPath: () => 'wxfile://usr',
    fileExists: async () => true,
    saveFile: async () => undefined,
    download: async () => 'wxfile://tmp/next',
    ...overrides
  }
}

describe('suit asset service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('resolves bundled overlay suits with the same file for icon and display', () => {
    const service = createSuitAssetService(makeDeps())
    expect(service.getCachedSuitFiles('scarf')).toEqual({ icon: 'bundled-scarf.png', display: 'bundled-scarf.png' })
    expect(service.getCachedSuitFiles('hat')).toEqual({ icon: 'bundled-hat.png', display: 'bundled-hat.png' })
  })

  it('falls back to the default portrait when nothing is cached', () => {
    const service = createSuitAssetService(makeDeps())
    expect(service.getCachedSuitFiles('hoodie')).toBeNull()
    expect(service.resolveSuitDisplay('hoodie')).toBe('bundled-default.png')
    expect(service.resolveSuitDisplay(null)).toBe('bundled-default.png')
    expect(service.resolveSuitDisplay('scarf')).toBe('bundled-scarf.png')
  })

  it('short-circuits the default suit to the bundled portrait without downloads', async () => {
    const download = vi.fn(async () => 'wxfile://tmp/x')
    const service = createSuitAssetService(makeDeps({ download }))
    const results = await service.ensureSuitAssets(['default'])
    expect(results.default).toEqual({ icon: 'bundled-default.png', display: 'bundled-default.png' })
    expect(download).not.toHaveBeenCalled()
  })

  it('downloads both icon and display for body suits and indexes them', async () => {
    const download = vi.fn(async () => 'wxfile://tmp/x')
    const saveFile = vi.fn(async () => undefined)
    const service = createSuitAssetService(makeDeps({ download, saveFile }))
    const results = await service.ensureSuitAssets(['hoodie'])
    expect(download).toHaveBeenCalledWith('hoodie-icon-v1.png')
    expect(download).toHaveBeenCalledWith('hoodie-v1.png')
    expect(saveFile).toHaveBeenCalledWith('wxfile://tmp/x', 'wxfile://usr/wardrobe-hoodie-icon-v1.png')
    expect(results.hoodie).toEqual({ icon: 'wxfile://usr/wardrobe-hoodie-icon-v1.png', display: 'wxfile://usr/wardrobe-hoodie-v1.png' })
    // 第二次直接命中缓存，不再下载
    await service.ensureSuitAssets(['hoodie'])
    expect(download).toHaveBeenCalledTimes(2)
  })

  it('keeps silent when a remote asset is unavailable and skips the suit', async () => {
    const download = vi.fn(async (fileName: string) => {
      if (fileName === 'dress-icon-v1.png') throw new Error('wardrobe_asset_status_404')
      return 'wxfile://tmp/ok'
    })
    const service = createSuitAssetService(makeDeps({ download }))
    const results = await service.ensureSuitAssets(['dress', 'scarf'])
    expect(results).toEqual({ scarf: { icon: 'bundled-scarf.png', display: 'bundled-scarf.png' } })
    expect(service.getCachedSuitFiles('dress')).toBeNull()
  })

  it('re-downloads when the cached file disappeared from user storage', async () => {
    const download = vi.fn(async () => 'wxfile://tmp/again')
    const deps = makeDeps({ download, fileExists: async () => false })
    const service = createSuitAssetService(deps)
    await service.ensureSuitAssets(['hoodie'])
    expect(download).toHaveBeenCalledTimes(2)
    expect(download).toHaveBeenCalledWith('hoodie-icon-v1.png')
    expect(download).toHaveBeenCalledWith('hoodie-v1.png')
  })
})
