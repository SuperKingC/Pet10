/**
 * 衣柜套装资产解析与按需下载（核心逻辑，依赖注入以便测试）。
 * Taro/require 的运行时绑定见 wardrobeSuitAssets.ts。
 */

export interface SuitAssetDeps {
  /** 随包内置素材（default/scarf）的本地路径表 */
  bundledImages: Record<string, string>
  readIndex(): Record<string, string>
  writeIndex(index: Record<string, string>): void
  userdataPath(): string
  fileExists(path: string): Promise<boolean>
  saveFile(tempPath: string, target: string): Promise<void>
  /** 下载远程素材，返回临时文件路径；失败抛错 */
  download(url: string): Promise<string>
}

export const WARDROBE_ASSET_STORAGE_KEY = 'wardrobeSuitAssets'

export function createSuitAssetService(deps: SuitAssetDeps) {
  function bundledOf(key: string): string | null {
    return deps.bundledImages[key] ?? null
  }

  function readIndex(): Record<string, string> {
    try {
      return deps.readIndex() ?? {}
    } catch {
      return {}
    }
  }

  /** 本地已可用的套装图：随包 → 下载缓存；都没有返回 null */
  function getCachedSuitImage(key: string): string | null {
    return bundledOf(key) ?? readIndex()[key] ?? null
  }

  /** 场景立绘解析：拿不到套装图时兜底回默认小多利 */
  function resolveSuitPortrait(key: string | null | undefined): string {
    if (key) {
      const resolved = getCachedSuitImage(key)
      if (resolved) return resolved
    }
    return deps.bundledImages.default
  }

  async function downloadOne(key: string): Promise<string | null> {
    try {
      const tempPath = await deps.download(`${key}-v1.png`)
      const target = `${deps.userdataPath()}/wardrobe-${key}-v1.png`
      await deps.saveFile(tempPath, target)
      return target
    } catch {
      return null
    }
  }

  /** 静默确保套装本地可用（并发下载，失败不抛错）；返回 key→本地路径映射 */
  async function ensureSuitAssets(keys: string[]): Promise<Record<string, string>> {
    const index = readIndex()
    const results: Record<string, string> = {}
    await Promise.all(
      keys.map(async (key) => {
        const bundled = bundledOf(key)
        if (bundled) {
          results[key] = bundled
          return
        }
        const cached = index[key]
        if (cached && (await deps.fileExists(cached))) {
          results[key] = cached
          return
        }
        const saved = await downloadOne(key)
        if (saved) {
          index[key] = saved
          results[key] = saved
        }
      })
    )
    try {
      deps.writeIndex(index)
    } catch {
      // 存储写失败不影响本次会话展示
    }
    return results
  }

  return { getCachedSuitImage, resolveSuitPortrait, ensureSuitAssets }
}

export type SuitAssetService = ReturnType<typeof createSuitAssetService>
