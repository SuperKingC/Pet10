import { useMemo, useReducer, useState } from 'react'
import Taro from '@tarojs/taro'
import { Button, Image, Text, View } from '@tarojs/components'
import { roomApi } from '../../services/roomApi'
import { MiniappTarotQuestionStage } from './MiniappTarotQuestionStage'
import { MiniappTarotSpreadStage } from './MiniappTarotSpreadStage'
import { MiniappTarotShuffleStage } from './MiniappTarotShuffleStage'
import { MiniappTarotCutStage } from './MiniappTarotCutStage'
import { MiniappTarotFanStage } from './MiniappTarotFanStage'
import { MiniappTarotRevealStage } from './MiniappTarotRevealStage'
import { MiniappTarotReadingStage } from './MiniappTarotReadingStage'
import { MiniappTarotHistoryPanel } from './MiniappTarotHistoryPanel'
import { TAROT_SANCTUARY_BACKGROUND } from './tarotAssets'
import { createTarotCandidates } from './tarotCards'
import { createInitialTarotFlow, tarotFlowReducer } from './tarotFlow'
import { listTarotHistory, saveTarotReading } from './tarotHistory'
import { buildShareText, buildTarotReading } from './tarotReading'
import { findTarotSpread } from './tarotSpreads'
import './MiniappTarotFlow.scss'

interface MiniappTarotFlowProps {
  roomId: string
  onClose(): void
}

const stageOrder = ['question', 'spread', 'shuffle', 'cut', 'fan', 'reveal', 'reading'] as const

export function MiniappTarotFlow({ roomId, onClose }: MiniappTarotFlowProps) {
  const [state, dispatch] = useReducer(tarotFlowReducer, undefined, createInitialTarotFlow)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [sharing, setSharing] = useState(false)
  const history = useMemo(() => historyOpen ? listTarotHistory() : [], [historyOpen, state.stage])
  const activeStageIndex = stageOrder.indexOf(state.stage)

  const createCandidates = () => createTarotCandidates(10)

  const finishReading = () => {
    if (state.stage !== 'reveal' || !state.flipped.every(Boolean)) return
    const reading = buildTarotReading(state.question, state.spread, state.drawn)
    saveTarotReading(reading)
    dispatch({ type: 'finish-reading', reading })
  }

  const shareReading = async () => {
    if (state.stage !== 'reading' || !roomId || sharing || state.shared) return
    setSharing(true)
    try {
      await roomApi.sendMessage(roomId, buildShareText(state.reading))
      dispatch({ type: 'mark-shared' })
      await Taro.showToast({ title: '已分享到聊天室', icon: 'success', duration: 1200 })
    } catch {
      await Taro.showToast({ title: '分享失败，请稍后重试', icon: 'none', duration: 1600 })
    } finally {
      setSharing(false)
    }
  }

  const restart = () => {
    setSharing(false)
    setHistoryOpen(false)
    dispatch({ type: 'restart' })
  }

  return (
    <View className="miniapp-tarot">
      <Image
        className="miniapp-tarot__background"
        src={TAROT_SANCTUARY_BACKGROUND}
        mode="aspectFill"
        fadeIn={false}
      />
      <View className="miniapp-tarot__veil" />
      <View className="miniapp-tarot__stars" />
      <View className="miniapp-tarot__header">
        <Button aria-label="退出塔罗占卜" onClick={onClose}>×</Button>
        <View className="miniapp-tarot__header-title">
          <Text>塔罗密室</Text>
          <Text>{state.stage === 'question' ? '聆听内心的提问' : findTarotSpread(state.spread).label}</Text>
        </View>
        <Button aria-label="查看占卜历史" onClick={() => setHistoryOpen(true)}>⌛</Button>
      </View>
      <View className="miniapp-tarot__progress" aria-hidden>
        {stageOrder.map((stage, index) => (
          <View
            key={stage}
            className={index <= activeStageIndex ? 'miniapp-tarot__progress-active' : ''}
          />
        ))}
      </View>

      {state.stage === 'question' && (
        <MiniappTarotQuestionStage
          question={state.question}
          onQuestionChange={(question) => dispatch({ type: 'set-question', question })}
          onContinue={() => dispatch({ type: 'continue' })}
        />
      )}
      {state.stage === 'spread' && (
        <MiniappTarotSpreadStage
          spread={state.spread}
          onSpreadChange={(spread) => dispatch({ type: 'set-spread', spread })}
          onContinue={() => dispatch({ type: 'continue' })}
        />
      )}
      {state.stage === 'shuffle' && (
        <MiniappTarotShuffleStage
          progress={state.progress}
          onProgress={(progress) => dispatch({ type: 'set-shuffle-progress', progress })}
          onContinue={() => dispatch({ type: 'continue' })}
          onSkip={() => dispatch({ type: 'skip-ritual', candidates: createCandidates() })}
        />
      )}
      {state.stage === 'cut' && (
        <MiniappTarotCutStage
          cutCount={state.cutCount}
          cutting={state.cutting}
          onStartCut={() => dispatch({ type: 'start-cut' })}
          onFinishCut={() => dispatch({ type: 'finish-cut' })}
          onContinue={() => dispatch({ type: 'enter-fan', candidates: createCandidates() })}
        />
      )}
      {state.stage === 'fan' && (
        <MiniappTarotFanStage
          candidates={state.candidates}
          picked={state.picked}
          flyingCard={state.flyingCard}
          needCount={findTarotSpread(state.spread).count}
          onPick={(index) => dispatch({ type: 'pick-card', index })}
          onFinishPick={(index) => dispatch({ type: 'finish-pick', index })}
          onContinue={() => dispatch({ type: 'enter-reveal' })}
        />
      )}
      {state.stage === 'reveal' && (
        <MiniappTarotRevealStage
          drawn={state.drawn}
          flipped={state.flipped}
          onFlip={(index) => dispatch({ type: 'flip-card', index })}
          onContinue={finishReading}
        />
      )}
      {state.stage === 'reading' && (
        <MiniappTarotReadingStage
          reading={state.reading}
          sharing={sharing}
          shared={state.shared}
          canShare={Boolean(roomId)}
          onShare={() => void shareReading()}
          onRestart={restart}
          onClose={onClose}
        />
      )}

      {historyOpen && <MiniappTarotHistoryPanel history={history} onClose={() => setHistoryOpen(false)} />}
    </View>
  )
}
