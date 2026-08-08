import { useEffect, useMemo, useRef, useState } from 'react'
import {
  QUESTION_CATEGORIES,
  SPREADS,
  buildClosing,
  buildShareText,
  interpretCard,
  listReadingHistory,
  saveReading,
  drawCards,
  type DrawnCard,
  type TarotCategory,
  type TarotReading,
  type TarotSpreadKey
} from './tarotDeck'

type Stage = 'question' | 'spread' | 'shuffle' | 'cut' | 'fan' | 'reveal' | 'reading'

interface TarotGameProps {
  onClose(): void
  /** 分享到聊天室（发送到当前 pair 房间） */
  onShareToChat(text: string): Promise<void>
}

function CardFace({ drawn, flipped }: { drawn: DrawnCard; flipped: boolean }) {
  return (
    <div className={`tarot-card3d ${flipped ? 'tarot-card3d--flipped' : ''} ${drawn.reversed ? 'tarot-card3d--reversed' : ''}`}>
      <div className="tarot-card3d__back">
        <span className="tarot-card3d__moon">🌙</span>
        <span className="tarot-card3d__stars">✦ ✧ ✦</span>
      </div>
      <div className="tarot-card3d__front">
        <span className="tarot-card3d__numeral">{drawn.card.numeral}</span>
        <span className="tarot-card3d__symbol">{drawn.card.symbol}</span>
        <strong>{drawn.card.name}</strong>
        <em>{drawn.reversed ? '逆位' : '正位'} · {drawn.position}</em>
      </div>
    </div>
  )
}

export function TarotGame({ onClose, onShareToChat }: TarotGameProps) {
  const [stage, setStage] = useState<Stage>('question')
  const [category, setCategory] = useState<TarotCategory>('overall')
  const [spread, setSpread] = useState<TarotSpreadKey>('single')
  const [shuffleProgress, setShuffleProgress] = useState(0)
  const [drawn, setDrawn] = useState<DrawnCard[]>([])
  const [picked, setPicked] = useState<number[]>([])
  const [flipped, setFlipped] = useState<boolean[]>([])
  const [reading, setReading] = useState<TarotReading>()
  const [sharing, setSharing] = useState(false)
  const [shared, setShared] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState<TarotReading[]>([])
  const shuffleTimer = useRef<number | undefined>(undefined)

  const needCount = useMemo(() => SPREADS.find((item) => item.key === spread)?.count ?? 1, [spread])

  useEffect(() => () => window.clearInterval(shuffleTimer.current), [])

  function startShuffle() {
    setShuffleProgress((current) => Math.min(100, current + 2))
  }

  function handleShuffleDown() {
    shuffleTimer.current = window.setInterval(startShuffle, 30)
  }

  function handleShuffleUp() {
    window.clearInterval(shuffleTimer.current)
  }

  function proceedToFan() {
    setDrawn(drawCards(spread))
    setPicked([])
    setStage('fan')
  }

  function pickCard(index: number) {
    if (picked.includes(index) || picked.length >= needCount) return
    const next = [...picked, index]
    setPicked(next)
    if (next.length >= needCount) {
      setFlipped(new Array(needCount).fill(false))
      window.setTimeout(() => setStage('reveal'), 350)
    }
  }

  function flipCard(index: number) {
    setFlipped((current) => current.map((value, i) => (i === index ? true : value)))
  }

  const allFlipped = flipped.length > 0 && flipped.every(Boolean)

  function finishReading() {
    const result: TarotReading = {
      category,
      spread,
      drawn,
      cardTexts: drawn.map((item) => interpretCard(item, category)),
      closing: buildClosing(drawn, category),
      createdAt: new Date().toISOString()
    }
    setReading(result)
    saveReading(result)
    setStage('reading')
  }

  async function share() {
    if (!reading || sharing) return
    setSharing(true)
    try {
      await onShareToChat(buildShareText(reading))
      setShared(true)
    } finally {
      setSharing(false)
    }
  }

  function restart() {
    setStage('question')
    setDrawn([])
    setPicked([])
    setFlipped([])
    setReading(undefined)
    setShared(false)
    setShuffleProgress(0)
  }

  return (
    <div className="tarot-game">
      <header className="tarot-game__header">
        <button onClick={onClose} aria-label="退出塔罗占卜">×</button>
        <h3>🔮 塔罗密室</h3>
        <button onClick={() => { setHistory(listReadingHistory()); setHistoryOpen(true) }}>记录</button>
      </header>

      {stage === 'question' && (
        <section className="tarot-stage">
          <p className="tarot-stage__title">深呼吸，选一个你想问的问题</p>
          {QUESTION_CATEGORIES.map((item) => (
            <button
              key={item.key}
              className={`tarot-choice ${category === item.key ? 'tarot-choice--active' : ''}`}
              onClick={() => setCategory(item.key)}
            >
              <span>{item.icon}</span>
              <strong>{item.label}</strong>
              <em>{item.description}</em>
            </button>
          ))}
          <button className="tarot-next" onClick={() => setStage('spread')}>下一步 · 选牌阵</button>
        </section>
      )}

      {stage === 'spread' && (
        <section className="tarot-stage">
          <p className="tarot-stage__title">选择牌阵</p>
          {SPREADS.map((item) => (
            <button
              key={item.key}
              className={`tarot-choice ${spread === item.key ? 'tarot-choice--active' : ''}`}
              onClick={() => setSpread(item.key)}
            >
              <span>{item.count === 1 ? '🂠' : '🂠🂠🂠'}</span>
              <strong>{item.label}</strong>
              <em>{item.description}</em>
            </button>
          ))}
          <button className="tarot-next" onClick={() => setStage('shuffle')}>下一步 · 洗牌</button>
        </section>
      )}

      {stage === 'shuffle' && (
        <section className="tarot-stage tarot-stage--center">
          <p className="tarot-stage__title">长按牌堆洗牌，让心意融进牌里</p>
          <button
            className="tarot-shuffle-deck"
            onPointerDown={handleShuffleDown}
            onPointerUp={handleShuffleUp}
            onPointerLeave={handleShuffleUp}
            aria-label="长按洗牌"
          >
            <span className="tarot-shuffle-deck__card" /><span className="tarot-shuffle-deck__card" /><span className="tarot-shuffle-deck__card" />
            <em>🌙</em>
          </button>
          <div className="tarot-shuffle-bar"><span style={{ width: `${shuffleProgress}%` }} /></div>
          <button className="tarot-next" disabled={shuffleProgress < 100} onClick={() => setStage('cut')}>
            {shuffleProgress < 100 ? '继续洗牌…' : '下一步 · 切牌'}
          </button>
        </section>
      )}

      {stage === 'cut' && (
        <section className="tarot-stage tarot-stage--center">
          <p className="tarot-stage__title">凭直觉切一下牌</p>
          <button className="tarot-cut-deck" onClick={() => window.setTimeout(proceedToFan, 450)}>
            <span className="tarot-cut-deck__left" /><span className="tarot-cut-deck__right" />
          </button>
          <p className="tarot-stage__hint">点击牌堆，完成切牌</p>
        </section>
      )}

      {stage === 'fan' && (
        <section className="tarot-stage">
          <p className="tarot-stage__title">心中默念问题，选出 {needCount} 张牌</p>
          <div className="tarot-fan">
            {Array.from({ length: 10 }, (_, index) => (
              <button
                key={index}
                className={`tarot-fan__card ${picked.includes(index) ? 'tarot-fan__card--picked' : ''}`}
                style={{ transform: `rotate(${(index - 4.5) * 7}deg) translateY(${Math.abs(index - 4.5) * 4}px)` }}
                onClick={() => pickCard(index)}
                aria-label={`第 ${index + 1} 张牌`}
              />
            ))}
          </div>
          <p className="tarot-stage__hint">已选 {picked.length}/{needCount}</p>
        </section>
      )}

      {stage === 'reveal' && (
        <section className="tarot-stage">
          <p className="tarot-stage__title">{allFlipped ? '牌已全部翻开' : '逐张点开，翻开你的牌'}</p>
          <div className="tarot-reveal-row">
            {drawn.map((item, index) => (
              <button key={item.card.id} className="tarot-reveal-slot" onClick={() => flipCard(index)}>
                <CardFace drawn={item} flipped={flipped[index]} />
              </button>
            ))}
          </div>
          <button className="tarot-next" disabled={!allFlipped} onClick={finishReading}>
            {allFlipped ? '查看解读' : `已翻开 ${flipped.filter(Boolean).length}/${needCount}`}
          </button>
        </section>
      )}

      {stage === 'reading' && reading && (
        <section className="tarot-stage tarot-reading">
          {reading.drawn.map((item, index) => (
            <article key={item.card.id} className="tarot-reading__card">
              <header>
                <span>{item.card.symbol}</span>
                <strong>{item.card.name}</strong>
                <em>{item.reversed ? '逆位' : '正位'} · {item.position}</em>
              </header>
              <p>{reading.cardTexts[index]}</p>
            </article>
          ))}
          <p className="tarot-reading__closing">{reading.closing}</p>
          <div className="tarot-reading__actions">
            <button disabled={sharing || shared} onClick={() => void share()}>
              {shared ? '已分享到聊天室 ✓' : sharing ? '分享中…' : '分享到聊天室'}
            </button>
            <button onClick={restart}>再占一次</button>
            <button onClick={onClose}>退出</button>
          </div>
        </section>
      )}

      {historyOpen && (
        <div className="sheet-overlay" onClick={() => setHistoryOpen(false)}>
          <div className="sheet tarot-history" onClick={(event) => event.stopPropagation()}>
            <h3>我的占卜记录</h3>
            {history.length === 0 && <p className="sheet__hint">还没有占卜记录。</p>}
            <ul>
              {history.map((item) => (
                <li key={item.createdAt}>
                  <time>{new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(item.createdAt))}</time>
                  <span>{QUESTION_CATEGORIES.find((cat) => cat.key === item.category)?.label}</span>
                  <p>{item.drawn.map((card) => `${card.card.name}(${card.reversed ? '逆' : '正'})`).join(' · ')}</p>
                </li>
              ))}
            </ul>
            <div className="sheet__actions">
              <button className="sheet__confirm" onClick={() => setHistoryOpen(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
