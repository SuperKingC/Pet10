import type { AnimationEvent as ReactAnimationEvent } from 'react'

interface TarotCutStageProps {
  cutCount: number
  cutting: boolean
  swapped: boolean
  onStartCut(): void
  onFinishCut(animationName: string): void
  onContinue(): void
}

export function TarotCutStage({
  cutCount,
  cutting,
  swapped,
  onStartCut,
  onFinishCut,
  onContinue
}: TarotCutStageProps) {
  function handleAnimationEnd(event: ReactAnimationEvent<HTMLSpanElement>) {
    onFinishCut(event.animationName)
  }

  return (
    <section className="tarot-stage tarot-stage--center">
      <p className="tarot-stage__title">凭直觉切一下牌</p>
      <button
        className={`tarot-cut-deck ${cutting ? 'tarot-cut-deck--cutting' : ''} ${swapped ? 'tarot-cut-deck--swapped' : ''}`}
        aria-label="切牌"
        disabled={cutting}
        onClick={onStartCut}
      >
        <span className="tarot-cut-deck__left" onAnimationEnd={handleAnimationEnd} />
        <span className="tarot-cut-deck__right" onAnimationEnd={handleAnimationEnd} />
      </button>
      <p className="tarot-stage__hint">{cutCount > 0 ? `已切 ${cutCount} 次，还可以继续切牌` : '点击牌堆，每次完成一次切牌'}</p>
      <button className="tarot-next" disabled={cutCount === 0 || cutting} onClick={onContinue}>完成切牌 · 进入选牌</button>
    </section>
  )
}
