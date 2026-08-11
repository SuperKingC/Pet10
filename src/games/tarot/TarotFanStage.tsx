import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import type { DrawnCard } from './tarotDeck'
import { createTarotFanFlight, type TarotFanFlight } from './tarotFanFlight'

interface TarotFanStageProps {
  drawn: DrawnCard[]
  picked: number[]
  flyingCard?: number
  needCount: number
  onPick(index: number): void
  onFinishPick(index: number): void
  onContinue(): void
}

interface ActiveFlight extends TarotFanFlight {
  index: number
}

export function TarotFanStage({
  drawn,
  picked,
  flyingCard,
  needCount,
  onPick,
  onFinishPick,
  onContinue
}: TarotFanStageProps) {
  const cardVisuals = useRef<Array<HTMLSpanElement | null>>([])
  const pickedSlots = useRef<Array<HTMLSpanElement | null>>([])
  const flightElement = useRef<HTMLSpanElement>(null)
  const [flight, setFlight] = useState<ActiveFlight>()

  useLayoutEffect(() => {
    if (flyingCard === undefined) {
      setFlight(undefined)
      return
    }

    const source = cardVisuals.current[flyingCard]
    const target = pickedSlots.current[picked.length]
    if (!source || !target) return

    const sourceBounds = source.getBoundingClientRect()
    const sourceWidth = source.offsetWidth || 58
    const sourceHeight = source.offsetHeight || 92
    const sourceRect = {
      left: sourceBounds.left + (sourceBounds.width - sourceWidth) / 2,
      top: sourceBounds.top + (sourceBounds.height - sourceHeight) / 2,
      width: sourceWidth,
      height: sourceHeight
    }
    const targetRect = target.getBoundingClientRect()
    setFlight({
      index: flyingCard,
      ...createTarotFanFlight(sourceRect, targetRect, (flyingCard - 4.5) * 6)
    })
  }, [flyingCard, picked.length])

  useLayoutEffect(() => {
    if (!flight || !flightElement.current) return

    let completed = false
    const animation = flightElement.current.animate(flight.keyframes, flight.options)
    animation.onfinish = () => {
      if (completed) return
      completed = true
      onFinishPick(flight.index)
    }

    return () => {
      completed = true
      animation.cancel()
    }
  }, [flight, onFinishPick])

  return (
    <section className="tarot-stage">
      <p className="tarot-stage__title">心中默念问题，选出 {needCount} 张牌</p>
      <div className={`tarot-picked-row tarot-picked-row--${needCount}`} aria-label="已选的牌">
        {Array.from({ length: needCount }, (_, order) => (
          <span
            className={`tarot-picked-slot ${picked[order] !== undefined ? 'tarot-picked-slot--filled' : ''}`}
            data-order={order}
            key={order}
            ref={(element) => { pickedSlots.current[order] = element }}
          >
            {picked[order] !== undefined && <span className="tarot-picked-card"><i>{order + 1}</i></span>}
          </span>
        ))}
      </div>
      <div className="tarot-fan">
        {drawn.map((_, index) => (
          <button
            key={index}
            className={`tarot-fan__card ${flyingCard === index ? 'tarot-fan__card--departing' : ''} ${picked.includes(index) ? 'tarot-fan__card--picked' : ''}`}
            style={{
              '--fan-x': `${(index - 4.5) * 18}px`,
              '--fan-angle': `${(index - 4.5) * 6}deg`,
              '--fan-drop': `${Math.round(Math.abs(index - 4.5) * 3)}px`
            } as CSSProperties}
            onClick={() => onPick(index)}
            disabled={picked.includes(index) || flyingCard !== undefined}
            aria-label={`第 ${index + 1} 张牌`}
          >
            <span
              className="tarot-fan__visual"
              ref={(element) => { cardVisuals.current[index] = element }}
            />
          </button>
        ))}
      </div>
      <p className="tarot-stage__hint">已选 {picked.length}/{needCount}</p>
      <button className="tarot-next" disabled={picked.length !== needCount || flyingCard !== undefined} onClick={onContinue}>翻开所选牌</button>
      {flight && createPortal(
        <span
          aria-hidden="true"
          className="tarot-fan-flight"
          ref={flightElement}
          style={{
            left: flight.overlay.left,
            top: flight.overlay.top,
            width: flight.overlay.width,
            height: flight.overlay.height
          }}
        />,
        document.body
      )}
    </section>
  )
}
