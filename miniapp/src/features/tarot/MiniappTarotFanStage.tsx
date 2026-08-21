import { useEffect } from 'react'
import { Button, Image, Text, View } from '@tarojs/components'
import type { TarotCandidate } from './tarotCards'
import { TAROT_CARD_BACK } from './tarotAssets'

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
      <View className={`miniapp-tarot__picked-row miniapp-tarot__picked-row--${needCount}`}>
        {Array.from({ length: needCount }, (_, order) => (
          <View
            key={order}
            className={picked[order] !== undefined
              ? 'miniapp-tarot__picked-slot miniapp-tarot__picked-slot--filled'
              : 'miniapp-tarot__picked-slot'}
          >
            {picked[order] !== undefined && (
              <>
                <Image src={TAROT_CARD_BACK} mode="aspectFill" fadeIn={false} />
                <Text>{order + 1}</Text>
              </>
            )}
          </View>
        ))}
      </View>
      <View className="miniapp-tarot__fan">
        {candidates.map((candidate, index) => {
          const offset = index - (candidates.length - 1) / 2
          return (
            <Button
              key={candidate.card.id}
              className={[
                'miniapp-tarot__fan-card',
                flyingCard === index ? 'miniapp-tarot__fan-card--flying' : '',
                picked.includes(index) ? 'miniapp-tarot__fan-card--picked' : '',
              ].filter(Boolean).join(' ')}
              style={{
                transform: `translateX(${offset * 32}rpx) translateY(${Math.abs(offset) * 7}rpx) rotate(${offset * 5}deg)`,
              }}
              disabled={picked.includes(index) || flyingCard !== undefined}
              onClick={() => onPick(index)}
            >
              <Image src={TAROT_CARD_BACK} mode="aspectFill" fadeIn={false} />
            </Button>
          )
        })}
      </View>
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
