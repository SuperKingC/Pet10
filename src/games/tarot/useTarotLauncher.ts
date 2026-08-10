import { useCallback, useState } from 'react'
import { TAROT_RESOURCE_URLS, preloadTarotArtwork } from './tarotAssets'

interface TarotLauncherOptions {
  preload?: typeof preloadTarotArtwork
  onOpen(): void
}

export function useTarotLauncher({ preload = preloadTarotArtwork, onOpen }: TarotLauncherOptions) {
  const [load, setLoad] = useState<{ progress: number; error?: string }>()

  const open = useCallback(async () => {
    setLoad({ progress: 0 })
    try {
      await preload(TAROT_RESOURCE_URLS, (progress) => setLoad({ progress }))
      setLoad(undefined)
      onOpen()
    } catch {
      setLoad({ progress: 0, error: '资源下载失败，请检查网络后重试' })
    }
  }, [onOpen, preload])

  const closeLoad = useCallback(() => setLoad(undefined), [])

  return { load, open, closeLoad }
}
