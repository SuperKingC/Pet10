import { useCallback, useEffect, useRef } from 'react'
import { advancePressProgress } from './tarotAnimation'

interface PressProgressOptions {
  progress: number
  onProgress(progress: number): void
}

export function usePressProgress({ progress, onProgress }: PressProgressOptions) {
  const frameRef = useRef<number | undefined>(undefined)
  const activeRef = useRef(false)
  const progressRef = useRef(progress)
  const lastFrameRef = useRef<number | undefined>(undefined)

  progressRef.current = progress

  const stop = useCallback(() => {
    activeRef.current = false
    lastFrameRef.current = undefined
    if (frameRef.current !== undefined) {
      window.cancelAnimationFrame(frameRef.current)
      frameRef.current = undefined
    }
  }, [])

  const animate = useCallback((timestamp: number) => {
    if (!activeRef.current) return
    const previousTimestamp = lastFrameRef.current ?? timestamp
    lastFrameRef.current = timestamp
    const next = advancePressProgress(progressRef.current, Math.min(48, timestamp - previousTimestamp))
    progressRef.current = next
    onProgress(next)
    if (next >= 100) {
      stop()
      return
    }
    frameRef.current = window.requestAnimationFrame(animate)
  }, [onProgress, stop])

  const start = useCallback(() => {
    if (progressRef.current >= 100 || activeRef.current) return
    activeRef.current = true
    lastFrameRef.current = undefined
    frameRef.current = window.requestAnimationFrame(animate)
  }, [animate])

  useEffect(() => stop, [stop])

  return { start, stop }
}
