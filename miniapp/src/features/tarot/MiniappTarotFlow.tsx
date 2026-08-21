import { useReducer } from 'react'
import { Button, Text, View } from '@tarojs/components'
import { MiniappTarotQuestionStage } from './MiniappTarotQuestionStage'
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
        <View className={state.stage === 'spread' ? 'miniapp-tarot__progress-active' : ''} />
        <View />
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
      ) : (
        <View className="miniapp-tarot__stage miniapp-tarot__stage--boundary">
          <Text className="miniapp-tarot__eyebrow">问题已记录</Text>
          <Text className="miniapp-tarot__title">{state.question}</Text>
          <Text className="miniapp-tarot__boundary-copy">
            下一阶段将接入与 PWA 一致的牌阵选择。
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
