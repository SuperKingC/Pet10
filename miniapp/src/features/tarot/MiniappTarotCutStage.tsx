import { useEffect } from 'react'
import { Button, Image, Text, View } from '@tarojs/components'
import { TAROT_CARD_BACK } from './tarotAssets'

interface MiniappTarotCutStageProps {
  cutCount: number
  cutting: boolean
  onStartCut(): void
  onFinishCut(): void
  onContinue(): void
}

function CutPile() {
  return (
    <View className="miniapp-tarot__cut-pile">
      {Array.from({ length: 10 }, (_, index) => (
        <View key={index} className="miniapp-tarot__cut-sheet" style={{ top: `${index * 3}rpx` }} />
      ))}
      <View className="miniapp-tarot__cut-face">
        <Image src={TAROT_CARD_BACK} mode="aspectFill" fadeIn={false} />
      </View>
    </View>
  )
}

export function MiniappTarotCutStage({
  cutCount,
  cutting,
  onStartCut,
  onFinishCut,
  onContinue,
}: MiniappTarotCutStageProps) {
  useEffect(() => {
    if (!cutting) return
    const timer = setTimeout(onFinishCut, 520)
    return () => clearTimeout(timer)
  }, [cutting, onFinishCut])

  return (
    <View className="miniapp-tarot__stage miniapp-tarot__stage--ritual miniapp-tarot__stage--cut">
      <Text className="miniapp-tarot__title">凭直觉切一下牌</Text>
      <View className="miniapp-tarot__spacer" />
      <Button
        className={[
          'miniapp-tarot__cut-deck',
          cutting ? 'miniapp-tarot__cut-deck--cutting' : '',
          cutCount % 2 === 1 ? 'miniapp-tarot__cut-deck--swapped' : '',
        ].filter(Boolean).join(' ')}
        disabled={cutting}
        onClick={onStartCut}
      >
        <View className="miniapp-tarot__cut-half miniapp-tarot__cut-half--left"><CutPile /></View>
        <View className="miniapp-tarot__cut-half miniapp-tarot__cut-half--right"><CutPile /></View>
      </Button>
      <View className="miniapp-tarot__spacer" />
      <Text className="miniapp-tarot__hint">
        {cutCount > 0 ? `已切 ${cutCount} 次，还可以继续切牌` : '点击牌堆，每次完成一次切牌'}
      </Text>
      <Button className="miniapp-tarot__next" disabled={cutCount === 0 || cutting} onClick={onContinue}>
        完成切牌 · 进入选牌
      </Button>
    </View>
  )
}
