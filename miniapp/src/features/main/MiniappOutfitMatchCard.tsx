import { Text, View } from '@tarojs/components'
import { matchSummary, type WardrobeView } from '../../domain/wardrobeModel'
import { MiniappOutfitPortrait } from './MiniappOutfitPortrait'
import './MiniappOutfitMatchCard.scss'

interface MiniappOutfitMatchCardProps {
  view: WardrobeView | null
  onPress(): void
}

// 小窝最底部的「今日默契换装」横卡：左侧当日装扮预览，右侧入口与连胜角标。
export function MiniappOutfitMatchCard({ view, onPress }: MiniappOutfitMatchCardProps) {
  const match = view?.match
  const previewKey = match?.myPick ?? view?.equipped ?? 'default'
  const matched = Boolean(match?.matchedToday)

  return (
    <View className={`outfit-match-card${matched ? ' outfit-match-card--matched' : ''}`} onClick={onPress}>
      <View className="outfit-match-card__preview">
        <MiniappOutfitPortrait suitKey={previewKey} />
      </View>
      <View className="outfit-match-card__body">
        <View className="outfit-match-card__title-row">
          <Text className="outfit-match-card__title">今日默契换装</Text>
          {match && match.streak > 0 && <Text className="outfit-match-card__streak">🔥×{match.streak}</Text>}
        </View>
        <Text className="outfit-match-card__summary">
          {view ? matchSummary(match!) : '一起为小多利选今日装扮'}
        </Text>
      </View>
      <View className="outfit-match-card__cta">
        <Text>{matched ? '看看' : match?.myPick ? '等 TA' : '去换装'}</Text>
      </View>
    </View>
  )
}
