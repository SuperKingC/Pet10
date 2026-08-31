import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSuitAssetService, type SuitAssetDeps } from './wardrobeAssetLoader'

function makeDeps(overrides: Partial<SuitAssetDeps> = {}): SuitAssetDeps {
  const index: Record<string, string> = {}
  return {
    bundledImages: { default: 'bundled-default.png', scarf: 'bundled-scarf.png' },
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

  it('resolves bundled suits directly and falls back to the default portrait', () => {
    const service = createSuitAssetService(makeDeps())
    expect(service.getCachedSuitImage('scarf')).toBe('bundled-scarf.png')
    expect(service.getCachedSuitImage('hoodie')).toBeNull()
    expect(service.resolveSuitPortrait('hoodie')).toBe('bundled-default.png')
    expect(service.resolveSuitPortrait(null)).toBe('bundled-default.png')
  })

  it('downloads missing suits into user storage and indexes them', async () => {
    const download = vi.fn(async () => 'wxfile://tmp/x')
    const saveFile = vi.fn(async () => undefined)
    const service = createSuitAssetService(makeDeps({ download, saveFile }))
    const results = await service.ensureSuitAssets(['hoodie'])
    expect(download).toHaveBeenCalledWith('hoodie-v1.png')
    expect(saveFile).toHaveBeenCalledWith('wxfile://tmp/x', 'wxfile://usr/wardrobe-hoodie-v1.png')
    expect(results.hoodie).toBe('wxfile://usr/wardrobe-hoodie-v1.png')
    // 第二次直接命中缓存，不再下载
    const again = await service.ensureSuitAssets(['hoodie'])
    expect(download).toHaveBeenCalledTimes(1)
    expect(again.hoodie).toBe('wxfile://usr/wardrobe-hoodie-v1.png')
  })

  it('keeps silent when the remote asset is unavailable', async () => {
    const download = vi.fn(async () => {
      throw new Error('wardrobe_asset_status_404')
    })
    const service = createSuitAssetService(makeDeps({ download }))
    const results = await service.ensureSuitAssets(['hoodie', 'scarf'])
    expect(results).toEqual({ scarf: 'bundled-scarf.png' })
    expect(service.getCachedSuitImage('hoodie')).toBeNull()
  })

  it('re-downloads when the cached file disappeared from user storage', async () => {
    const download = vi.fn(async () => 'wxfile://tmp/again')
    const deps = makeDeps({ download, fileExists: async () => false })
    const service = createSuitAssetService(deps)
    await service.ensureSuitAssets(['hoodie'])
    expect(download).toHaveBeenCalledTimes(1)
    expect(download).toHaveBeenCalledWith('hoodie-v1.png')
  })
})
