import { Button, Text, View } from '@tarojs/components'
import type { MiniappFortune } from '../../services/socialApi'
import './MiniappFortuneView.scss'

const fortuneSections = [
  ['love', '感情'],
  ['study', '学习'],
  ['work', '工作'],
  ['wealth', '财富'],
  ['health', '健康'],
] as const

interface MiniappFortuneViewProps {
  fortune: MiniappFortune
  onClose(): void
}

export function MiniappFortuneView({ fortune, onClose }: MiniappFortuneViewProps) {
  return (
    <View className="miniapp-fortune-view">
      <View className="miniapp-fortune-view__header">
        <Button className="miniapp-fortune-view__back" onClick={onClose}>‹</Button>
        <Text className="miniapp-fortune-view__title">今日运势 · {fortune.content.zodiac}</Text>
        <View className="miniapp-fortune-view__header-spacer" />
      </View>
      <View className="miniapp-fortune-view__body">
        <View className="miniapp-fortune-view__overall">
          <Text className="miniapp-fortune-view__label">综合运势</Text>
          <Text className="miniapp-fortune-view__summary">{fortune.content.overall.summary}</Text>
          <Text className="miniapp-fortune-view__stars">{'★'.repeat(fortune.content.overall.rating)}</Text>
          {fortune.content.overall.text && <Text className="miniapp-fortune-view__text">{fortune.content.overall.text}</Text>}
          <Text className="miniapp-fortune-view__meta">幸运色：{fortune.content.luckyColor.name} · 幸运数字：{fortune.content.luckyNumber}</Text>
        </View>
        {fortuneSections.map(([key, label]) => {
          const section = fortune.content[key]
          if (!section) return null
          return (
            <View key={key} className="miniapp-fortune-view__section">
              <View className="miniapp-fortune-view__section-head">
                <Text>{label}</Text>
                <Text>{'★'.repeat(section.rating)}</Text>
              </View>
              <Text className="miniapp-fortune-view__section-body">{'text' in section ? section.text : section.partnered}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}
