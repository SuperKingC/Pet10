import { useEffect, useMemo, useRef, useState, type AnimationEvent as ReactAnimationEvent, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import {
  SPREADS,
  buildProfessionalReading,
  buildShareText,
  listReadingHistory,
  saveReading,
  drawCards,
  type DrawnCard,
  type TarotReading,
  type TarotSpreadKey
} from './tarotDeck'
import { TAROT_ARTWORK } from './tarotAssets'
import { TarotCard } from './TarotCard'
import { TarotSpreadPicker } from './TarotSpreadPicker'

type Stage = 'question' | 'spread' | 'shuffle' | 'cut' | 'fan' | 'reveal' | 'reading'

interface TarotGameProps {
  onClose(): void
  /** 分享到聊天室（发送到当前 pair 房间） */
  onShareToChat(text: string): Promise<void>
}

export function TarotGame({ onClose, onShareToChat }: TarotGameProps) {
  const [stage, setStage] = useState<Stage>('question')
  const [question, setQuestion] = useState('')
  const [promptOffset, setPromptOffset] = useState(0)
  const [spread, setSpread] = useState<TarotSpreadKey>('single')
  const [shuffleProgress, setShuffleProgress] = useState(0)
  const [drawn, setDrawn] = useState<DrawnCard[]>([])
  const [picked, setPicked] = useState<number[]>([])
  const [flyingCard, setFlyingCard] = useState<number | null>(null)
  const [flipped, setFlipped] = useState<boolean[]>([])
  const [reading, setReading] = useState<TarotReading>()
  const [sharing, setSharing] = useState(false)
  const [shared, setShared] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState<TarotReading[]>([])
  const [cutting, setCutting] = useState(false)
  const [cutCount, setCutCount] = useState(0)
  const [revealReady, setRevealReady] = useState(false)
  const shuffleFrame = useRef<number | undefined>(undefined)
  const shuffleProgressRef = useRef(0)
  const shuffleActive = useRef(false)
  const shuffleLastFrame = useRef<number | undefined>(undefined)
  const shuffleProgressNode = useRef<HTMLSpanElement | null>(null)

  const needCount = useMemo(() => SPREADS.find((item) => item.key === spread)?.count ?? 1, [spread])
  const prompts = ['我现在最需要看清的是什么？', '怎样做才能突破目前的瓶颈？', '这段关系真正的课题是什么？', '下一步怎样走会更稳妥？', '我正在忽略哪一个重要信号？', '现在最值得投入的方向是什么？']

  function paintShuffleProgress(value: number) {
    if (!shuffleProgressNode.current) return
    shuffleProgressNode.current.style.transform = `scaleX(${value / 100})`
  }

  function stopShuffle() {
    shuffleActive.current = false
    shuffleLastFrame.current = undefined
    if (shuffleFrame.current !== undefined) {
      window.cancelAnimationFrame(shuffleFrame.current)
      shuffleFrame.current = undefined
    }
  }

  function animateShuffle(timestamp: number) {
    if (!shuffleActive.current) return
    const previousTimestamp = shuffleLastFrame.current ?? timestamp
    const elapsed = Math.min(48, timestamp - previousTimestamp)
    shuffleLastFrame.current = timestamp
    const next = Math.min(100, shuffleProgressRef.current + elapsed * 0.072)
    shuffleProgressRef.current = next
    paintShuffleProgress(next)
    if (next >= 100) {
      stopShuffle()
      setShuffleProgress(100)
      return
    }
    shuffleFrame.current = window.requestAnimationFrame(animateShuffle)
  }

  useEffect(() => () => stopShuffle(), [])

  useEffect(() => {
    if (stage === 'shuffle') paintShuffleProgress(shuffleProgressRef.current)
  }, [stage])

  function handleShuffleDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (shuffleProgressRef.current >= 100 || shuffleActive.current) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    shuffleActive.current = true
    shuffleLastFrame.current = undefined
    shuffleFrame.current = window.requestAnimationFrame(animateShuffle)
  }

  function handleShuffleUp(event?: ReactPointerEvent<HTMLButtonElement>) {
    if (event && event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    }
    stopShuffle()
  }

  function proceedToFan() {
    setDrawn(drawCards(spread))
    setPicked([])
    setStage('fan')
  }

  function prefersReducedMotion() {
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  function cutDeck() {
    if (cutting) return
    if (prefersReducedMotion()) {
      setCutCount((value) => value + 1)
      return
    }
    setCutting(true)
  }

  function finishCut(event: ReactAnimationEvent<HTMLSpanElement>) {
    if (event.animationName !== 'tarot-cut-upper' && event.animationName !== 'tarot-cut-upper-reverse') return
    if (!cutting) return
    setCutting(false)
    setCutCount((value) => value + 1)
  }

  function skipRitual() {
    stopShuffle()
    shuffleProgressRef.current = 100
    paintShuffleProgress(100)
    setShuffleProgress(100)
    proceedToFan()
  }

  function pickCard(index: number) {
    if (flyingCard !== null || picked.includes(index) || picked.length >= needCount) return
    if (prefersReducedMotion()) {
      setPicked((current) => [...current, index])
      return
    }
    setFlyingCard(index)
  }

  function finishPick(index: number) {
    if (flyingCard !== index) return
    setPicked((current) => [...current, index])
    setFlyingCard(null)
  }

  function proceedToReveal() {
    if (picked.length !== needCount) return
    setFlipped(new Array(needCount).fill(false))
    setStage('reveal')
  }

  function flipCard(index: number) {
    setFlipped((current) => current.map((value, i) => (i === index ? true : value)))
  }

  const allFlipped = flipped.length > 0 && flipped.every(Boolean)

  useEffect(() => {
    if (!allFlipped) { setRevealReady(false); return }
    const timer = window.setTimeout(() => setRevealReady(true), 500)
    return () => window.clearTimeout(timer)
  }, [allFlipped])

  function finishReading() {
    const result = buildProfessionalReading(question, spread, drawn)
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
    setFlyingCard(null)
    setFlipped([])
    setReading(undefined)
    setShared(false)
    stopShuffle()
    shuffleProgressRef.current = 0
    paintShuffleProgress(0)
    setShuffleProgress(0)
    setQuestion('')
    setCutting(false)
    setCutCount(0)
    setRevealReady(false)
  }

  return (
    <div className="tarot-game">
      <header className="tarot-game__header">
        <button onClick={onClose} aria-label="退出塔罗占卜">×</button>
        <h3>🔮 塔罗密室</h3>
        <button onClick={() => { setHistory(listReadingHistory()); setHistoryOpen(true) }}>记录</button>
      </header>
      {stage !== 'reading' && <div className="tarot-progress" aria-label="占卜进度">{(['question', 'spread', 'shuffle', 'cut', 'fan', 'reveal'] as Stage[]).map((item, index) => <span key={item} className={item === stage ? 'tarot-progress--active' : ''}>{index + 1}</span>)}</div>}

      {stage === 'question' && (
        <section className="tarot-stage tarot-stage--question">
          <p className="tarot-stage__title">先写下你真正想知道的事</p>
          <textarea className="tarot-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="例如：我该如何面对这段关系？" maxLength={120} />
          <div className="tarot-prompts__header"><span>不知道怎么问？试试这些</span><button type="button" onClick={() => setPromptOffset((value) => value + 3)}>换一批</button></div>
          <div className="tarot-prompts">
            {Array.from({ length: 3 }, (_, index) => prompts[(promptOffset + index) % prompts.length]).map((prompt) => <button type="button" key={prompt} className="tarot-prompt" onClick={() => setQuestion(prompt)}>{prompt}</button>)}
          </div>
          <button className="tarot-next" onClick={() => setStage('spread')}>下一步 · 选牌阵</button>
        </section>
      )}

      {stage === 'spread' && (
        <section className="tarot-stage">
          <p className="tarot-stage__title">选择牌阵</p>
          <TarotSpreadPicker value={spread} onChange={setSpread} />
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
            onPointerCancel={handleShuffleUp}
            aria-label="长按洗牌"
          >
            {Array.from({ length: 10 }, (_, index) => (
              <span key={index} className="tarot-shuffle-deck__slot"><i className="tarot-shuffle-deck__card" /></span>
            ))}
          </button>
          <div className="tarot-shuffle-bar"><span ref={shuffleProgressNode} /></div>
          <button className="tarot-next" disabled={shuffleProgress < 100} onClick={() => setStage('cut')}>
            {shuffleProgress < 100 ? '继续洗牌…' : '下一步 · 切牌'}
          </button>
          <button className="tarot-skip" type="button" onClick={skipRitual}>跳过洗牌与切牌</button>
        </section>
      )}

      {stage === 'cut' && (
        <section className="tarot-stage tarot-stage--center">
          <p className="tarot-stage__title">凭直觉切一下牌</p>
          <button className={`tarot-cut-deck ${cutting ? 'tarot-cut-deck--cutting' : ''} ${cutCount % 2 ? 'tarot-cut-deck--swapped' : ''}`} aria-label="切牌" onClick={cutDeck}>
            <span className="tarot-cut-deck__left" onAnimationEnd={finishCut} /><span className="tarot-cut-deck__right" onAnimationEnd={finishCut} />
          </button>
          <p className="tarot-stage__hint">{cutCount > 0 ? `已切 ${cutCount} 次，还可以继续切牌` : '点击牌堆，每次完成一次切牌'}</p>
          <button className="tarot-next" disabled={cutCount === 0 || cutting} onClick={proceedToFan}>完成切牌 · 进入选牌</button>
        </section>
      )}

      {stage === 'fan' && (
        <section className="tarot-stage">
          <p className="tarot-stage__title">心中默念问题，选出 {needCount} 张牌</p>
          <div className="tarot-picked-row" aria-label="已选的牌">
            {picked.map((index, order) => <span className="tarot-picked-card" key={index}><i>{order + 1}</i></span>)}
          </div>
          <div className="tarot-fan">
            {Array.from({ length: 10 }, (_, index) => (
              <button
                key={index}
                className={`tarot-fan__card ${flyingCard === index ? 'tarot-fan__card--flying' : ''} ${picked.includes(index) ? 'tarot-fan__card--picked' : ''}`}
                style={{
                  '--fan-x': `${(index - 4.5) * 18}px`,
                  '--fan-mid-x': `${(index - 4.5) * 9.9}px`,
                  '--fan-angle': `${(index - 4.5) * 6}deg`,
                  '--fan-drop': `${Math.abs(index - 4.5) * 3}px`
                } as CSSProperties}
                onClick={() => pickCard(index)}
                disabled={picked.includes(index) || flyingCard !== null}
                aria-label={`第 ${index + 1} 张牌`}
                onAnimationEnd={(event) => {
                  if (event.animationName === 'tarot-pick-smooth') finishPick(index)
                }}
              ><span className="tarot-fan__visual" /></button>
            ))}
          </div>
          <div className="tarot-fan__deck-anchor" aria-hidden="true">
            <span className="tarot-fan__deck-anchor-card" />
          </div>
          <p className="tarot-stage__hint">已选 {picked.length}/{needCount}</p>
          <button className="tarot-next" disabled={picked.length !== needCount} onClick={proceedToReveal}>翻开所选牌</button>
        </section>
      )}

      {stage === 'reveal' && (
        <section className="tarot-stage">
          <p className="tarot-stage__title">{allFlipped ? '牌已全部翻开' : '逐张点开，翻开你的牌'}</p>
          <div className="tarot-reveal-row">
            {drawn.map((item, index) => (
              <button key={item.card.id} className="tarot-reveal-slot" onClick={() => flipCard(index)}>
                <TarotCard drawn={item} flipped={flipped[index]} />
              </button>
            ))}
          </div>
          <button className="tarot-next" disabled={!revealReady} onClick={finishReading}>
            {allFlipped ? '查看解读' : `已翻开 ${flipped.filter(Boolean).length}/${needCount}`}
          </button>
        </section>
      )}

      {stage === 'reading' && reading && (
        <section className="tarot-stage tarot-reading">
          <div className="tarot-reading__question"><span>你的问题</span><strong>{reading.question}</strong></div>
          <section className="tarot-reading__summary"><h3>核心结论</h3><p>{reading.summary}</p></section>
          <section className="tarot-reading__synthesis"><h3>牌阵之间的关系</h3><p>{reading.synthesis}</p></section>
          {reading.drawn.map((item, index) => (
            <article key={item.card.id} className="tarot-reading__card">
              <img className="tarot-reading__art" src={TAROT_ARTWORK[item.card.id]} alt={`${item.card.name}牌面`} />
              <header>
                <span>{item.card.symbol}</span>
                <strong>{item.card.name}</strong>
                <em>{item.reversed ? '逆位' : '正位'} · {item.position}</em>
              </header>
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
          <section className="tarot-reading__guidance"><h3>未来 24 小时</h3><p>{reading.next24Hours}</p><h3>未来 7 天观察</h3><p>{reading.next7Days}</p><h3>避免误读</h3>{reading.misreadings.map((item) => <p key={item}>{item}</p>)}</section>
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
                  <span>{SPREADS.find((spreadItem) => spreadItem.key === item.spread)?.label}</span>
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
