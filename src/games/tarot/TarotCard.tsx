import { TAROT_ARTWORK } from './tarotAssets'
import type { DrawnCard } from './tarotDeck'

interface TarotCardProps {
  drawn: DrawnCard
  flipped: boolean
}

export function TarotCard({ drawn, flipped }: TarotCardProps) {
  return (
    <div className={`tarot-card ${flipped ? 'tarot-card--flipped' : ''}`}>
      <div className="tarot-card__body">
        <div className="tarot-card__back" />
        <div className="tarot-card__front">
          <img
            className={`tarot-card__art ${drawn.reversed ? 'tarot-card__art--reversed' : ''} ${drawn.card.id === 13 ? 'tarot-card__art--crop' : ''}`}
            src={TAROT_ARTWORK[drawn.card.id]}
            alt={`${drawn.card.name}牌面`}
            width="768"
            height="1152"
            decoding="async"
          />
          <span className="tarot-card__numeral">{drawn.card.numeral}</span>
        </div>
      </div>
      <span className="tarot-card__labels">
        <strong>{drawn.card.name}</strong>
        <em>{drawn.reversed ? '逆位' : '正位'} · {drawn.position}</em>
      </span>
    </div>
  )
}
