import { Button, Text, View } from '@tarojs/components'
import type { TarotReading } from './tarotReading'
import { findTarotSpread } from './tarotSpreads'

interface MiniappTarotHistoryPanelProps {
  history: TarotReading[]
  onClose(): void
}

function formatDate(value: string): string {
  const date = new Date(value)
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function MiniappTarotHistoryPanel({ history, onClose }: MiniappTarotHistoryPanelProps) {
  return (
    <View className="miniapp-tarot-history">
      <View className="miniapp-tarot-history__backdrop" onClick={onClose} />
      <View className="miniapp-tarot-history__panel">
        <Text className="miniapp-tarot-history__title">我的占卜记录</Text>
        {history.length === 0 && <Text className="miniapp-tarot__hint">还没有占卜记录。</Text>}
        {history.map((item) => (
          <View key={item.createdAt} className="miniapp-tarot-history__item">
            <View>
              <Text>{formatDate(item.createdAt)}</Text>
              <Text>{findTarotSpread(item.spread).label}</Text>
            </View>
            <Text>{item.question}</Text>
            <Text>{item.drawn.map((card) => `${card.card.name}(${card.reversed ? '逆' : '正'})`).join(' · ')}</Text>
          </View>
        ))}
        <Button onClick={onClose}>关闭</Button>
      </View>
    </View>
  )
}
