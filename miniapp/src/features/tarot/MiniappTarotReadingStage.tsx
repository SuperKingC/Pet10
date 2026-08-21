import { Button, Image, Text, View } from '@tarojs/components'
import { getTarotArtworkUrl } from './tarotAssets'
import type { TarotReading } from './tarotReading'

interface MiniappTarotReadingStageProps {
  reading: TarotReading
  sharing: boolean
  shared: boolean
  canShare: boolean
  onShare(): void
  onRestart(): void
  onClose(): void
}

export function MiniappTarotReadingStage({
  reading,
  sharing,
  shared,
  canShare,
  onShare,
  onRestart,
  onClose,
}: MiniappTarotReadingStageProps) {
  return (
    <View className="miniapp-tarot__stage miniapp-tarot__reading">
      <View className="miniapp-tarot__reading-question">
        <Text>你的问题</Text>
        <Text>{reading.question}</Text>
      </View>
      <View className="miniapp-tarot__reading-section">
        <Text className="miniapp-tarot__reading-heading">核心结论</Text>
        <Text>{reading.summary}</Text>
      </View>
      <View className="miniapp-tarot__reading-section">
        <Text className="miniapp-tarot__reading-heading">牌阵之间的关系</Text>
        <Text>{reading.synthesis}</Text>
      </View>
      {reading.drawn.map((item, index) => (
        <View key={`${item.card.id}-${index}`} className="miniapp-tarot__reading-card">
          <Image
            className={item.reversed ? 'miniapp-tarot__reading-art miniapp-tarot__reading-art--reversed' : 'miniapp-tarot__reading-art'}
            src={getTarotArtworkUrl(item.card.id)}
            mode="aspectFill"
            fadeIn={false}
          />
          <View className="miniapp-tarot__reading-card-title">
            <Text>{item.card.symbol} {item.card.name}</Text>
            <Text>{item.reversed ? '逆位' : '正位'} · {item.position}</Text>
          </View>
          {[
            ['牌位作用', reading.cardAnalyses[index]?.positionRole],
            ['核心象征', reading.cardAnalyses[index]?.symbolism],
            ['能量状态', reading.cardAnalyses[index]?.orientation],
            ['与你的问题', reading.cardAnalyses[index]?.questionConnection],
            ['现实表现', reading.cardAnalyses[index]?.realWorldPattern],
            ['行动建议', reading.cardAnalyses[index]?.action],
            ['风险提醒', reading.cardAnalyses[index]?.caution],
          ].map(([label, content]) => (
            <View key={label} className="miniapp-tarot__analysis">
              <Text>{label}</Text>
              <Text>{content}</Text>
            </View>
          ))}
        </View>
      ))}
      <Text className="miniapp-tarot__reading-closing">{reading.closing}</Text>
      <View className="miniapp-tarot__reading-section">
        <Text className="miniapp-tarot__reading-heading">未来 24 小时</Text>
        <Text>{reading.next24Hours}</Text>
        <Text className="miniapp-tarot__reading-heading">未来 7 天观察</Text>
        <Text>{reading.next7Days}</Text>
        <Text className="miniapp-tarot__reading-heading">避免误读</Text>
        {reading.misreadings.map((item) => <Text key={item}>· {item}</Text>)}
      </View>
      <View className="miniapp-tarot__reading-actions">
        <Button disabled={!canShare || sharing || shared} onClick={onShare}>
          {!canShare ? '绑定好友后可分享' : shared ? '已分享到聊天室 ✓' : sharing ? '分享中…' : '分享到聊天室'}
        </Button>
        <Button onClick={onRestart}>再占一次</Button>
        <Button onClick={onClose}>退出</Button>
      </View>
    </View>
  )
}
