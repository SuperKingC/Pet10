import type { TarotSpreadKey } from './tarotDeck'
import { TarotSpreadPicker } from './TarotSpreadPicker'

interface TarotSpreadStageProps {
  spread: TarotSpreadKey
  onSpreadChange(spread: TarotSpreadKey): void
  onContinue(): void
}

export function TarotSpreadStage({ spread, onSpreadChange, onContinue }: TarotSpreadStageProps) {
  return (
    <section className="tarot-stage">
      <p className="tarot-stage__title">选择适合问题的牌阵</p>
      <TarotSpreadPicker value={spread} onChange={onSpreadChange} />
      <button className="tarot-next" onClick={onContinue}>下一步 · 洗牌</button>
    </section>
  )
}
