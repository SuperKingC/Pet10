import type { CSSProperties } from 'react'
import type { DrawnCard } from './tarotDeck'

interface TarotFanStageProps {
  drawn: DrawnCard[]
  picked: number[]
  flyingCard?: number
  needCount: number
  onPick(index: number): void
  onFinishPick(index: number): void
  onContinue(): void
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
  return (
    <section className="tarot-stage">
      <p className="tarot-stage__title">心中默念问题，选出 {needCount} 张牌</p>
      <div className="tarot-picked-row" aria-label="已选的牌">
        {picked.map((index, order) => <span className="tarot-picked-card" key={index}><i>{order + 1}</i></span>)}
      </div>
      <div className="tarot-fan">
        {drawn.map((_, index) => (
          <button
            key={index}
            className={`tarot-fan__card ${flyingCard === index ? 'tarot-fan__card--flying' : ''} ${picked.includes(index) ? 'tarot-fan__card--picked' : ''}`}
            style={{
              '--fan-x': `${(index - 4.5) * 18}px`,
              '--fan-mid-x': `${(index - 4.5) * 9.9}px`,
              '--fan-angle': `${(index - 4.5) * 6}deg`,
              '--fan-drop': `${Math.abs(index - 4.5) * 3}px`
            } as CSSProperties}
            onClick={() => onPick(index)}
            disabled={picked.includes(index) || flyingCard !== undefined}
            aria-label={`第 ${index + 1} 张牌`}
            onAnimationEnd={(event) => {
              if (event.animationName === 'tarot-pick-smooth') onFinishPick(index)
            }}
          ><span className="tarot-fan__visual" /></button>
        ))}
      </div>
      <div className="tarot-fan__deck-anchor" aria-hidden="true">
        <span className="tarot-fan__deck-anchor-card" />
      </div>
      <p className="tarot-stage__hint">已选 {picked.length}/{needCount}</p>
      <button className="tarot-next" disabled={picked.length !== needCount || flyingCard !== undefined} onClick={onContinue}>翻开所选牌</button>
    </section>
  )
}
