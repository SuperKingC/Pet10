import { SPREADS } from './tarotDeck'
import type { TarotReading } from './tarotReading'

interface TarotHistorySheetProps {
  history: TarotReading[]
  onClose(): void
}

export function TarotHistorySheet({ history, onClose }: TarotHistorySheetProps) {
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet tarot-history" onClick={(event) => event.stopPropagation()}>
        <h3>我的占卜记录</h3>
        {history.length === 0 && <p className="sheet__hint">还没有占卜记录。</p>}
        <ul>
          {history.map((item) => (
            <li key={item.createdAt}>
              <time>{new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(item.createdAt))}</time>
              <span>{SPREADS.find((spread) => spread.key === item.spread)?.label}</span>
              <p>{item.drawn.map((card) => `${card.card.name}(${card.reversed ? '逆' : '正'})`).join(' · ')}</p>
            </li>
          ))}
        </ul>
        <div className="sheet__actions"><button className="sheet__confirm" onClick={onClose}>关闭</button></div>
      </div>
    </div>
  )
}
