import { Button, Text, View } from '@tarojs/components'
import {
  TAROT_SPREADS,
  type MiniappTarotSpread,
} from './tarotSpreads'

interface MiniappTarotSpreadStageProps {
  spread: MiniappTarotSpread
  onSpreadChange(spread: MiniappTarotSpread): void
  onContinue(): void
}

export function MiniappTarotSpreadStage({
  spread,
  onSpreadChange,
  onContinue,
}: MiniappTarotSpreadStageProps) {
  return (
    <View className="miniapp-tarot__stage miniapp-tarot__stage--spread">
      <Text className="miniapp-tarot__title">选择适合问题的牌阵</Text>
      <View className="miniapp-tarot__spreads">
        {TAROT_SPREADS.map((option) => (
          <Button
            key={option.key}
            className={[
              'miniapp-tarot__spread',
              spread === option.key ? 'miniapp-tarot__spread--active' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => onSpreadChange(option.key)}
          >
            <View
              className={`miniapp-tarot__spread-layout miniapp-tarot__spread-layout--${option.count}`}
            >
              {Array.from({ length: option.count }, (_, index) => (
                <View key={index} className="miniapp-tarot__spread-card">
                  <Text>✦</Text>
                </View>
              ))}
            </View>
            <View className="miniapp-tarot__spread-copy">
              <Text className="miniapp-tarot__spread-label">{option.label}</Text>
              <Text className="miniapp-tarot__spread-description">{option.description}</Text>
              <Text className="miniapp-tarot__spread-meta">
                {option.count} 张牌 · {option.readingMode}
              </Text>
            </View>
          </Button>
        ))}
      </View>
      <Button className="miniapp-tarot__next" onClick={onContinue}>
        下一步 · 洗牌
      </Button>
    </View>
  )
}
