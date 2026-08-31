/**
 * 衣柜套装资产解析与按需下载（核心逻辑，依赖注入以便测试）。
 * 文件命名与 wardrobeModel.suitAssetFiles 同口径：叠穿件一张文件、主体服装 icon+display 两张。
 * 展示解析是同步的（不逐次做 fs access），文件被系统清理后由 ensureSuitAssets 的存在性检查自愈。
 * Taro/require 的运行时绑定见 wardrobeSuitAssets.ts。
 */

import { suitAssetFiles } from '../domain/wardrobeModel'

export interface SuitAssetDeps {
  /** 随包文件表：键为文件名（'default' 指原装立绘） */
  bundledImages: Record<string, string>
  readIndex(): Record<string, string>
  writeIndex(index: Record<string, string>): void
  userdataPath(): string
  fileExists(path: string): Promise<boolean>
  saveFile(tempPath: string, target: string): Promise<void>
  /** 下载远程素材（传文件名），返回临时文件路径；失败抛错 */
  download(fileName: string): Promise<string>
}

export interface SuitFiles {
  /** 网格服装特写图标 */
  icon: string
  /** 预览/场景展示素材 */
  display: string
}

export const WARDROBE_ASSET_STORAGE_KEY = 'wardrobeSuitAssets'

export function createSuitAssetService(deps: SuitAssetDeps) {
  function bundledOf(fileName: string): string | null {
    return deps.bundledImages[fileName] ?? null
  }

  function readIndex(): Record<string, string> {
    try {
      return deps.readIndex() ?? {}
    } catch {
      return {}
    }
  }

  function resolveFile(fileName: string): string | null {
    return bundledOf(fileName) ?? readIndex()[fileName] ?? null
  }

  /** 套装双文件本地解析：任一缺失返回 null（调用方回退默认立绘/占位态） */
  function getCachedSuitFiles(key: string): SuitFiles | null {
    const files = suitAssetFiles(key)
    const icon = resolveFile(files.icon)
    const display = resolveFile(files.display)
    if (!icon || !display) return null
    return { icon, display }
  }

  /** 场景立绘解析：叠穿件永远叠在原装立绘上；拿不到展示素材时兜底回默认 */
  function resolveSuitDisplay(key: string | null | undefined): string {
    if (key) {
      const resolved = resolveFile(suitAssetFiles(key).display)
      if (resolved) return resolved
    }
    return deps.bundledImages.default
  }

  async function downloadToUserPath(fileName: string): Promise<string | null> {
    try {
      const tempPath = await deps.download(fileName)
      const target = `${deps.userdataPath()}/wardrobe-${fileName}`
      await deps.saveFile(tempPath, target)
      return target
    } catch {
      return null
    }
  }

  /** 静默确保套装本地可用（icon+display 两张，并发下载，失败不抛错） */
  async function ensureSuitAssets(keys: string[]): Promise<Record<string, SuitFiles>> {
    const index = readIndex()
    const results: Record<string, SuitFiles> = {}
    await Promise.all(
      keys.map(async (key) => {
        // 原装小多利不走素材文件，直接用随包立绘
        if (key === 'default') {
          results[key] = { icon: deps.bundledImages.default, display: deps.bundledImages.default }
          return
        }
        const files = suitAssetFiles(key)
        const saved: Record<string, string> = {}
        for (const fileName of [files.icon, files.display]) {
          const bundled = bundledOf(fileName)
          if (bundled) {
            saved[fileName] = bundled
            continue
          }
          const cached = index[fileName]
          if (cached && (await deps.fileExists(cached))) {
            saved[fileName] = cached
            continue
          }
          const path = await downloadToUserPath(fileName)
          if (path) {
            index[fileName] = path
            saved[fileName] = path
          }
        }
        if (saved[files.icon] && saved[files.display]) {
          results[key] = { icon: saved[files.icon], display: saved[files.display] }
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

  return { getCachedSuitFiles, resolveSuitDisplay, ensureSuitAssets }
}

export type SuitAssetService = ReturnType<typeof createSuitAssetService>
