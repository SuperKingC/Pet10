import { useEffect } from 'react'
import { Button, Image, Text, View } from '@tarojs/components'
import type { TarotCandidate } from './tarotCards'
import { getTarotCardBack } from './tarotAssets'

interface MiniappTarotFanStageProps {
  candidates: TarotCandidate[]
  picked: number[]
  flyingCard?: number
  needCount: number
  onPick(index: number): void
  onFinishPick(index: number): void
  onContinue(): void
}

export function MiniappTarotFanStage({
  candidates,
  picked,
  flyingCard,
  needCount,
  onPick,
  onFinishPick,
  onContinue,
}: MiniappTarotFanStageProps) {
  useEffect(() => {
    if (flyingCard === undefined) return
    const timer = setTimeout(() => onFinishPick(flyingCard), 900)
    return () => clearTimeout(timer)
  }, [flyingCard, onFinishPick])

  return (
    <View className="miniapp-tarot__stage miniapp-tarot__stage--fan">
      <Text className="miniapp-tarot__title">心中默念问题，选出 {needCount} 张牌</Text>
      <View className="miniapp-tarot__spacer" />
      <View className={`miniapp-tarot__picked-row miniapp-tarot__picked-row--${needCount}`}>
        {Array.from({ length: needCount }, (_, order) => (
          <View
            key={order}
            className={picked[order] !== undefined
              ? 'miniapp-tarot__picked-slot miniapp-tarot__picked-slot--filled'
              : 'miniapp-tarot__picked-slot'}
          >
            {picked[order] !== undefined && (
              <Image src={getTarotCardBack()} mode="aspectFill" fadeIn={false} />
            )}
          </View>
        ))}
      </View>
      <View className={`miniapp-tarot__fan miniapp-tarot__fan--${needCount}`}>
        {candidates.map((candidate, index) => (
          <Button
            key={candidate.card.id}
            className={[
              'miniapp-tarot__fan-card',
              flyingCard === index ? 'miniapp-tarot__fan-card--flying' : '',
              picked.includes(index) ? 'miniapp-tarot__fan-card--picked' : '',
            ].filter(Boolean).join(' ')}
            style={flyingCard === index
              ? { '--fly-x': `${(picked.length - (needCount - 1) / 2) * (needCount === 5 ? 94 : 158)}rpx` }
              : undefined}
            disabled={picked.includes(index) || flyingCard !== undefined}
            onClick={() => onPick(index)}
          >
            <Image src={getTarotCardBack()} mode="aspectFill" fadeIn={false} />
          </Button>
        ))}
      </View>
      <View className="miniapp-tarot__spacer" />
      <Text className="miniapp-tarot__hint">已选 {picked.length}/{needCount}</Text>
      <Button
        className="miniapp-tarot__next"
        disabled={picked.length !== needCount || flyingCard !== undefined}
        onClick={onContinue}
      >
        翻开所选牌
      </Button>
    </View>
  )
}
