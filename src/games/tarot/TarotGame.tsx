import { useMemo, useState, type CSSProperties } from 'react'
import { SPREADS } from './tarotDeck'
import { TAROT_CARD_BACK, TAROT_SANCTUARY_BACKGROUND } from './tarotAssets'
import { buildShareText, type TarotReading } from './tarotReading'
import { listReadingHistory } from './tarotHistory'
import { TarotCutStage } from './TarotCutStage'
import { TarotFanStage } from './TarotFanStage'
import { TarotHistorySheet } from './TarotHistorySheet'
import { TarotQuestionStage } from './TarotQuestionStage'
import { TarotReadingStage } from './TarotReadingStage'
import { TarotRevealStage } from './TarotRevealStage'
import { TarotShuffleStage } from './TarotShuffleStage'
import { TarotSpreadStage } from './TarotSpreadStage'
import { useTarotFlow } from './useTarotFlow'

interface TarotGameProps {
  onClose(): void
  onShareToChat(text: string): Promise<void>
}

const RITUAL_STAGES = ['question', 'spread', 'shuffle', 'cut', 'fan', 'reveal'] as const
const TAROT_ASSET_STYLES = {
  '--tarot-card-back': `url("${TAROT_CARD_BACK}")`,
  '--tarot-sanctuary-background': `url("${TAROT_SANCTUARY_BACKGROUND}")`
} as CSSProperties

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function TarotGame({ onClose, onShareToChat }: TarotGameProps) {
  const flow = useTarotFlow()
  const { state } = flow
  const [sharing, setSharing] = useState(false)
  const [history, setHistory] = useState<TarotReading[]>()
  const needCount = useMemo(
    () => SPREADS.find((spread) => spread.key === state.spread)?.count ?? 1,
    [state.spread]
  )

  async function share() {
    if (state.stage !== 'reading' || sharing || state.shared) return
    setSharing(true)
    try {
      await onShareToChat(buildShareText(state.reading))
      flow.markShared()
    } finally {
      setSharing(false)
    }
  }

  function startCut() {
    flow.startCut(prefersReducedMotion())
  }

  function finishCut(animationName: string) {
    if (state.stage !== 'cut' || !state.activeAnimation) return
    if (animationName !== 'tarot-cut-upper' && animationName !== 'tarot-cut-upper-reverse') return
    flow.finishCut(state.activeAnimation.token)
  }

  return (
    <div className="tarot-game" style={TAROT_ASSET_STYLES}>
      <header className="tarot-game__header">
        <button onClick={onClose} aria-label="退出塔罗占卜">×</button>
        <h3>🔮 塔罗密室</h3>
        <button onClick={() => setHistory(listReadingHistory())}>记录</button>
      </header>

      {state.stage !== 'reading' && (
        <div className="tarot-progress" aria-label="占卜进度">
          {RITUAL_STAGES.map((stage, index) => (
            <span key={stage} className={stage === state.stage ? 'tarot-progress--active' : ''}>{index + 1}</span>
          ))}
        </div>
      )}

      {state.stage === 'question' && (
        <TarotQuestionStage
          question={state.question}
          onQuestionChange={flow.setQuestion}
          onContinue={flow.continueFlow}
        />
      )}

      {state.stage === 'spread' && (
        <TarotSpreadStage
          spread={state.spread}
          onSpreadChange={flow.setSpread}
          onContinue={flow.continueFlow}
        />
      )}

      {state.stage === 'shuffle' && (
        <TarotShuffleStage
          progress={state.progress}
          onProgress={flow.setShuffleProgress}
          onContinue={flow.continueFlow}
          onSkip={flow.skipRitual}
        />
      )}

      {state.stage === 'cut' && (
        <TarotCutStage
          cutCount={state.cutCount}
          cutting={state.activeAnimation !== undefined}
          swapped={state.cutCount % 2 === 1}
          onStartCut={startCut}
          onFinishCut={finishCut}
          onContinue={flow.enterFan}
        />
      )}

      {state.stage === 'fan' && (
        <TarotFanStage
          drawn={state.drawn}
          picked={state.picked}
          flyingCard={state.flyingCard}
          needCount={needCount}
          onPick={(index) => flow.pickCard(index, prefersReducedMotion())}
          onFinishPick={flow.finishPick}
          onContinue={flow.enterReveal}
        />
      )}

      {state.stage === 'reveal' && (
        <TarotRevealStage
          drawn={state.drawn}
          flipped={state.flipped}
          onFlip={flow.flipCard}
          onContinue={flow.finishReading}
        />
      )}

      {state.stage === 'reading' && (
        <TarotReadingStage
          reading={state.reading}
          sharing={sharing}
          shared={state.shared}
          onShare={() => void share()}
          onRestart={flow.restart}
          onClose={onClose}
        />
      )}

      {history && <TarotHistorySheet history={history} onClose={() => setHistory(undefined)} />}
    </div>
  )
}
