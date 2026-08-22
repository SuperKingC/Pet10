export type LaunchAsset = {
  id: string
  label: string
  src: string
}

export class LaunchAssetError extends Error {
  readonly failures: Array<{ asset: LaunchAsset; error: unknown }>

  constructor(failures: Array<{ asset: LaunchAsset; error: unknown }>) {
    super('启动资源准备失败')
    this.name = 'LaunchAssetError'
    this.failures = failures
  }
}

export type AssetLoad = (src: string) => Promise<void>

/** Only remote or explicitly addressable WeChat files need image decoding. */
export function shouldDecodeLaunchImage(src: string) {
  return /^(https?:\/\/|wxfile:\/\/|cloud:\/\/)/i.test(src)
}

export async function prepareLaunchAssets(
  assets: LaunchAsset[],
  onProgress: ((progress: number) => void) | undefined,
  loadAsset: AssetLoad,
) {
  if (assets.length === 0) {
    onProgress?.(1)
    return
  }

  let completed = 0
  const failures: Array<{ asset: LaunchAsset; error: unknown }> = []
  onProgress?.(0)

  await Promise.all(assets.map(async (asset) => {
    try {
      await loadAsset(asset.src)
    } catch (error) {
      failures.push({ asset, error })
    } finally {
      completed += 1
      onProgress?.(completed / assets.length)
    }
  }))

  if (failures.length > 0) {
    throw new LaunchAssetError(failures)
  }
}
