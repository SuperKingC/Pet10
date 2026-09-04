import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import Taro from '@tarojs/taro'
import { Button, Image, Text, View } from '@tarojs/components'
import { roomApi } from '../../services/roomApi'
import { nestTaskApi } from '../../services/nestTaskApi'
import { MiniappTarotQuestionStage } from './MiniappTarotQuestionStage'
import { MiniappTarotSpreadStage } from './MiniappTarotSpreadStage'
import { MiniappTarotShuffleStage } from './MiniappTarotShuffleStage'
import { MiniappTarotCutStage } from './MiniappTarotCutStage'
import { MiniappTarotFanStage } from './MiniappTarotFanStage'
import { MiniappTarotRevealStage } from './MiniappTarotRevealStage'
import { MiniappTarotReadingStage } from './MiniappTarotReadingStage'
import { MiniappTarotHistoryPanel } from './MiniappTarotHistoryPanel'
import { getTarotSanctuaryBackground, preloadTarotResources } from './tarotAssets'
import { createTarotCandidates } from './tarotCards'
import { createInitialTarotFlow, tarotFlowReducer } from './tarotFlow'
import { listTarotHistory, saveTarotReading } from './tarotHistory'
import { buildShareText, buildTarotReading, buildTarotShareTitle } from './tarotReading'
import { findTarotSpread, type MiniappTarotSpread } from './tarotSpreads'
import './MiniappTarotFlow.scss'

interface MiniappTarotFlowProps {
  roomId: string
  onClose(): void
  onShareTitleChange?(title: string): void
}

const stageOrder = ['question', 'spread', 'shuffle', 'cut', 'fan', 'reveal', 'reading'] as const

export function MiniappTarotFlow({ roomId, onClose, onShareTitleChange }: MiniappTarotFlowProps) {
  const [state, dispatch] = useReducer(tarotFlowReducer, undefined, createInitialTarotFlow)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [resourcesLoaded, setResourcesLoaded] = useState(false)
  const leaveTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const history = useMemo(() => historyOpen ? listTarotHistory() : [], [historyOpen, state.stage])
  const activeStageIndex = stageOrder.indexOf(state.stage)

  useEffect(() => {
    let cancelled = false
    preloadTarotResources((p) => {
      if (!cancelled) setLoadProgress(p)
    }).then(() => {
      if (!cancelled) setResourcesLoaded(true)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => () => {
    leaveTimersRef.current.forEach((timer) => clearTimeout(timer))
    leaveTimersRef.current = []
  }, [])

  // while the reading is on screen, register a tarot-flavored share title so
  // the page-level useShareAppMessage can invite friends with the result card
  useEffect(() => {
    if (state.stage !== 'reading' || !state.reading) return
    onShareTitleChange?.(buildTarotShareTitle(state.reading))
    return () => onShareTitleChange?.('')
  }, [state.stage, state.reading, onShareTitleChange])

  const createCandidates = () => createTarotCandidates(10)

  const selectSpread = (spread: MiniappTarotSpread) => {
    if (leaving || state.stage !== 'spread') return
    dispatch({ type: 'set-spread', spread })
    leaveTimersRef.current.push(
      setTimeout(() => setLeaving(true), 220),
      setTimeout(() => {
        dispatch({ type: 'continue' })
        setLeaving(false)
      }, 660),
    )
  }

  const finishReading = () => {
    if (state.stage !== 'reveal' || !state.flipped.every(Boolean)) return
    const reading = buildTarotReading(state.question, state.spread, state.drawn)
    saveTarotReading(reading)
    // 解读完成上报每日任务（测一次塔罗）；静默失败不影响解读流程
    if (roomId) void nestTaskApi.reportActivity(roomId, 'tarot').catch(() => undefined)
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
    leaveTimersRef.current.forEach((timer) => clearTimeout(timer))
    leaveTimersRef.current = []
    setSharing(false)
    setHistoryOpen(false)
    setLeaving(false)
    dispatch({ type: 'restart' })
  }

  return (
    <View className={['miniapp-tarot', leaving ? 'miniapp-tarot--leaving' : ''].filter(Boolean).join(' ')}>
      <Image
        className="miniapp-tarot__background"
        src={getTarotSanctuaryBackground()}
        mode="aspectFill"
        fadeIn={false}
      />
      <View className="miniapp-tarot__veil" />
      <View className="miniapp-tarot__stars" />
      <View className="miniapp-tarot__fade" />

      {!resourcesLoaded ? (
        <View className="miniapp-tarot__loading">
          <View className="miniapp-tarot__loading-icon">
            <View className="miniapp-tarot__loading_ring" />
            <Text className="miniapp-tarot__loading_pct">{Math.round(loadProgress * 100)}%</Text>
          </View>
          <Text className="miniapp-tarot__loading_hint">正在加载塔罗资源…</Text>
        </View>
      ) : (
        <>
          <View className="miniapp-tarot__header">
            <Button aria-label="退出塔罗" onClick={onClose}>×</Button>
            <View className="miniapp-tarot__header-title">
              <Text>塔罗密室</Text>
              <Text>{state.stage === 'question' ? '聆听内心的提问' : findTarotSpread(state.spread).label}</Text>
            </View>
            <Button aria-label="查看塔罗历史" onClick={() => setHistoryOpen(true)}>⌛</Button>
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
              onSelect={selectSpread}
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
        </>
      )}
    </View>
  )
}
