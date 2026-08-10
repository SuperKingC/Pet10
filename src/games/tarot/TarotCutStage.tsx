import { useEffect, useRef } from 'react'
import { getTarotCutFrame, TAROT_CUT_DURATION_MS, type TarotCutFrame } from './tarotCutMotion'

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
  const leftRef = useRef<HTMLSpanElement>(null)
  const rightRef = useRef<HTMLSpanElement>(null)
  const shadowRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!cutting) return

    let frameId = 0
    let startTime: number | undefined
    let completed = false
    const compact = typeof window.matchMedia === 'function'
      ? window.matchMedia('(max-width: 700px)').matches
      : window.innerWidth <= 700

    function applyPile(element: HTMLSpanElement | null, frame: TarotCutFrame['upper']) {
      if (!element) return
      element.style.transform = `translate3d(${frame.x}px,${frame.y}px,${frame.z}px) rotateX(${frame.rotateX}deg) rotateZ(${frame.rotateZ}deg)`
      element.style.filter = `brightness(${frame.brightness})`
      element.style.zIndex = String(frame.zIndex)
    }

    function render(time: number) {
      startTime ??= time
      const elapsed = time - startTime
      const progress = Math.min(1, elapsed / TAROT_CUT_DURATION_MS)
      const cutFrame = getTarotCutFrame(progress, compact, cutCount > 0)
      const upperElement = swapped ? rightRef.current : leftRef.current
      const lowerElement = swapped ? leftRef.current : rightRef.current

      applyPile(upperElement, cutFrame.upper)
      applyPile(lowerElement, cutFrame.lower)
      if (shadowRef.current) {
        shadowRef.current.style.transform = `translateX(calc(-50% + ${cutFrame.shadow.x}px)) scale(${cutFrame.shadow.scale})`
        shadowRef.current.style.opacity = String(cutFrame.shadow.opacity)
      }

      if (progress < 1) {
        frameId = requestAnimationFrame(render)
        return
      }
      if (!completed) {
        completed = true
        onFinishCut(swapped ? 'tarot-cut-upper-reverse' : 'tarot-cut-upper')
      }
    }

    frameId = requestAnimationFrame(render)
    return () => cancelAnimationFrame(frameId)
  }, [cutCount, cutting, onFinishCut, swapped])

  return (
    <section className="tarot-stage tarot-stage--center">
      <p className="tarot-stage__title">凭直觉切一下牌</p>
      <button
        className={`tarot-cut-deck ${cutCount > 0 ? 'tarot-cut-deck--settled' : ''} ${cutting ? 'tarot-cut-deck--cutting' : ''} ${swapped ? 'tarot-cut-deck--swapped' : ''}`}
        aria-label="切牌"
        disabled={cutting}
        onClick={onStartCut}
      >
        <span ref={shadowRef} className="tarot-cut-deck__shadow" aria-hidden="true" />
        <span ref={leftRef} className="tarot-cut-deck__left" />
        <span ref={rightRef} className="tarot-cut-deck__right" />
      </button>
      <p className="tarot-stage__hint">{cutCount > 0 ? `已切 ${cutCount} 次，还可以继续切牌` : '点击牌堆，每次完成一次切牌'}</p>
      <button className="tarot-next" disabled={cutCount === 0 || cutting} onClick={onContinue}>完成切牌 · 进入选牌</button>
    </section>
  )
}
