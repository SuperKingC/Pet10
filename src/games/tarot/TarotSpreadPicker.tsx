import { SPREADS, type TarotSpreadKey } from './tarotDeck'

interface TarotSpreadPickerProps {
  value: TarotSpreadKey
  onChange(value: TarotSpreadKey): void
}

export function TarotSpreadPicker({ value, onChange }: TarotSpreadPickerProps) {
  return (
    <div className="tarot-spreads">
      {SPREADS.map((spread) => (
        <button key={spread.key} className={`tarot-spread ${value === spread.key ? 'tarot-spread--active' : ''}`} onClick={() => onChange(spread.key)}>
          <span className={`tarot-spread__layout tarot-spread__layout--${spread.count}`} aria-hidden="true">
            {Array.from({ length: spread.count }, (_, index) => <i key={index} />)}
          </span>
          <span className="tarot-spread__copy"><strong>{spread.label}</strong><em>{spread.description}</em><small>{spread.count} 张牌 · {spread.count === 1 ? '聚焦回答' : '时间线阅读'}</small></span>
        </button>
      ))}
    </div>
  )
}
