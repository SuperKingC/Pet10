import { useCallback, type PointerEvent as ReactPointerEvent } from 'react'
import { usePressProgress } from './usePressProgress'

interface TarotShuffleStageProps {
  progress: number
  onProgress(progress: number): void
  onContinue(): void
  onSkip(): void
}

export function TarotShuffleStage({ progress, onProgress, onContinue, onSkip }: TarotShuffleStageProps) {
  const handleProgress = useCallback((nextProgress: number) => onProgress(nextProgress), [onProgress])
  const pressProgress = usePressProgress({ progress, onProgress: handleProgress })

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture?.(event.pointerId)
    pressProgress.start()
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    }
    pressProgress.stop()
  }

  return (
    <section className="tarot-stage tarot-stage--center">
      <p className="tarot-stage__title">长按牌堆洗牌，让心意融进牌里</p>
      <button
        className="tarot-shuffle-deck"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerEnd}
        onPointerLeave={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        aria-label="长按洗牌"
      >
        {Array.from({ length: 10 }, (_, index) => (
          <span key={index} className="tarot-shuffle-deck__slot"><i className="tarot-shuffle-deck__card" /></span>
        ))}
      </button>
      <div className="tarot-shuffle-bar"><span style={{ transform: `scaleX(${progress / 100})` }} /></div>
      <button className="tarot-next" disabled={progress < 100} onClick={onContinue}>
        {progress < 100 ? '继续洗牌…' : '下一步 · 切牌'}
      </button>
      <button className="tarot-skip" type="button" onClick={onSkip}>跳过洗牌与切牌</button>
    </section>
  )
}
