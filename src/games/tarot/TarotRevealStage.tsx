import { useEffect, useState } from 'react'
import type { DrawnCard } from './tarotDeck'
import { TarotCard } from './TarotCard'

interface TarotRevealStageProps {
  drawn: DrawnCard[]
  flipped: boolean[]
  onFlip(index: number): void
  onContinue(): void
}

export function TarotRevealStage({ drawn, flipped, onFlip, onContinue }: TarotRevealStageProps) {
  const allFlipped = flipped.length > 0 && flipped.every(Boolean)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!allFlipped) {
      setReady(false)
      return
    }
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReady(true)
      return
    }
    const timer = window.setTimeout(() => setReady(true), 500)
    return () => window.clearTimeout(timer)
  }, [allFlipped])

  return (
    <section className="tarot-stage">
      <p className="tarot-stage__title">{allFlipped ? '牌已全部翻开' : '逐张点开，翻开你的牌'}</p>
      <div className="tarot-reveal-row">
        {drawn.map((item, index) => (
          <button key={`${item.card.id}-${index}`} className="tarot-reveal-slot" onClick={() => onFlip(index)}>
            <TarotCard drawn={item} flipped={flipped[index]} />
          </button>
        ))}
      </div>
      <button className="tarot-next" disabled={!ready} onClick={onContinue}>
        {allFlipped ? '查看解读' : `已翻开 ${flipped.filter(Boolean).length}/${drawn.length}`}
      </button>
    </section>
  )
}
