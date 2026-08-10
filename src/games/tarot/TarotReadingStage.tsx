import { TAROT_ARTWORK } from './tarotAssets'
import type { TarotReading } from './tarotReading'

interface TarotReadingStageProps {
  reading: TarotReading
  sharing: boolean
  shared: boolean
  onShare(): void
  onRestart(): void
  onClose(): void
}

export function TarotReadingStage({ reading, sharing, shared, onShare, onRestart, onClose }: TarotReadingStageProps) {
  return (
    <section className="tarot-stage tarot-reading">
      <div className="tarot-reading__question"><span>你的问题</span><strong>{reading.question}</strong></div>
      <section className="tarot-reading__summary"><h3>核心结论</h3><p>{reading.summary}</p></section>
      <section className="tarot-reading__synthesis"><h3>牌阵之间的关系</h3><p>{reading.synthesis}</p></section>
      {reading.drawn.map((item, index) => (
        <article key={`${item.card.id}-${index}`} className="tarot-reading__card">
          <img className="tarot-reading__art" src={TAROT_ARTWORK[item.card.id]} alt={`${item.card.name}牌面`} />
          <header><span>{item.card.symbol}</span><strong>{item.card.name}</strong><em>{item.reversed ? '逆位' : '正位'} · {item.position}</em></header>
          <div className="tarot-reading__analysis">
            <p><strong>牌位作用</strong>{reading.cardAnalyses[index]?.positionRole}</p>
            <p><strong>核心象征</strong>{reading.cardAnalyses[index]?.symbolism}</p>
            <p><strong>能量状态</strong>{reading.cardAnalyses[index]?.orientation}</p>
            <p><strong>与你的问题</strong>{reading.cardAnalyses[index]?.questionConnection}</p>
            <p><strong>现实表现</strong>{reading.cardAnalyses[index]?.realWorldPattern}</p>
            <p><strong>行动建议</strong>{reading.cardAnalyses[index]?.action}</p>
            <p><strong>风险提醒</strong>{reading.cardAnalyses[index]?.caution}</p>
          </div>
        </article>
      ))}
      <p className="tarot-reading__closing">{reading.closing}</p>
      <section className="tarot-reading__guidance">
        <h3>未来 24 小时</h3><p>{reading.next24Hours}</p>
        <h3>未来 7 天观察</h3><p>{reading.next7Days}</p>
        <h3>避免误读</h3>{reading.misreadings.map((item) => <p key={item}>{item}</p>)}
      </section>
      <div className="tarot-reading__actions">
        <button disabled={sharing || shared} onClick={onShare}>{shared ? '已分享到聊天室 ✓' : sharing ? '分享中…' : '分享到聊天室'}</button>
        <button onClick={onRestart}>再占一次</button>
        <button onClick={onClose}>退出</button>
      </div>
    </section>
  )
}
