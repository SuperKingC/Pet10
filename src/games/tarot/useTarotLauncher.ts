import { useCallback, useRef, useState } from 'react'
import { TAROT_RESOURCE_URLS, preloadTarotArtwork } from './tarotAssets'

interface TarotLauncherOptions {
  preload?: typeof preloadTarotArtwork
  onOpen(): void
}

export function useTarotLauncher({ preload = preloadTarotArtwork, onOpen }: TarotLauncherOptions) {
  const [load, setLoad] = useState<{ progress: number; error?: string }>()
  const loadAttemptRef = useRef(0)

  const open = useCallback(async () => {
    const loadAttempt = loadAttemptRef.current + 1
    loadAttemptRef.current = loadAttempt
    setLoad({ progress: 0 })
    try {
      await preload(TAROT_RESOURCE_URLS, (progress) => {
        if (loadAttemptRef.current === loadAttempt) setLoad({ progress })
      })
      if (loadAttemptRef.current !== loadAttempt) return
      setLoad(undefined)
      onOpen()
    } catch {
      if (loadAttemptRef.current !== loadAttempt) return
      setLoad({ progress: 0, error: '资源下载失败，请检查网络后重试' })
    }
  }, [onOpen, preload])

  const closeLoad = useCallback(() => {
    loadAttemptRef.current += 1
    setLoad(undefined)
  }, [])

  return { load, open, closeLoad }
}
