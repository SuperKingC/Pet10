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
        className={`tarot-shuffle-deck${progress >= 100 ? ' tarot-shuffle-deck--complete' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerEnd}
        onPointerLeave={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        aria-label="长按洗牌"
      >
        <span className="tarot-shuffle-deck__orbit tarot-shuffle-deck__orbit--outer" aria-hidden="true" />
        <span className="tarot-shuffle-deck__orbit tarot-shuffle-deck__orbit--inner" aria-hidden="true" />
        <span className="tarot-shuffle-deck__rune" aria-hidden="true">✦</span>
        <span className="tarot-shuffle-deck__burst" aria-hidden="true" />
        {Array.from({ length: 10 }, (_, index) => (
          <span key={index} className={`tarot-shuffle-deck__slot tarot-shuffle-deck__slot--${index % 2 ? 'even' : 'odd'}`}><i className="tarot-shuffle-deck__card" /></span>
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
