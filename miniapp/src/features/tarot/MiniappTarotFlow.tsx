import { useReducer } from 'react'
import { Button, Text, View } from '@tarojs/components'
import { MiniappTarotQuestionStage } from './MiniappTarotQuestionStage'
import { MiniappTarotSpreadStage } from './MiniappTarotSpreadStage'
import { findTarotSpread } from './tarotSpreads'
import { createInitialTarotFlow, tarotFlowReducer } from './tarotFlow'
import './MiniappTarotFlow.scss'

interface MiniappTarotFlowProps {
  onClose(): void
}

export function MiniappTarotFlow({ onClose }: MiniappTarotFlowProps) {
  const [state, dispatch] = useReducer(tarotFlowReducer, undefined, createInitialTarotFlow)

  return (
    <View className="miniapp-tarot">
      <View className="miniapp-tarot__stars" />
      <View className="miniapp-tarot__header">
        <Button aria-label="退出塔罗占卜" onClick={onClose}>×</Button>
        <Text>🔮 塔罗密室</Text>
        <View className="miniapp-tarot__header-spacer" />
      </View>
      <View className="miniapp-tarot__progress" aria-hidden>
        <View className="miniapp-tarot__progress-active" />
        <View className={state.stage !== 'question' ? 'miniapp-tarot__progress-active' : ''} />
        <View className={state.stage === 'shuffle' ? 'miniapp-tarot__progress-active' : ''} />
        <View />
        <View />
        <View />
      </View>

      {state.stage === 'question' ? (
        <MiniappTarotQuestionStage
          question={state.question}
          onQuestionChange={(question) => dispatch({ type: 'set-question', question })}
          onContinue={() => dispatch({ type: 'continue' })}
        />
      ) : state.stage === 'spread' ? (
        <MiniappTarotSpreadStage
          spread={state.spread}
          onSpreadChange={(spread) => dispatch({ type: 'set-spread', spread })}
          onContinue={() => dispatch({ type: 'continue' })}
        />
      ) : (
        <View className="miniapp-tarot__stage miniapp-tarot__stage--boundary">
          <Text className="miniapp-tarot__eyebrow">牌阵已确认</Text>
          <Text className="miniapp-tarot__title">{findTarotSpread(state.spread).label}</Text>
          <Text className="miniapp-tarot__boundary-copy">
            洗牌仪式将在下一阶段接入，当前不会提前运行任何动画。
          </Text>
          <Button
            className="miniapp-tarot__secondary"
            onClick={() => dispatch({ type: 'restart' })}
          >
            重新提问
          </Button>
        </View>
      )}
    </View>
  )
}
