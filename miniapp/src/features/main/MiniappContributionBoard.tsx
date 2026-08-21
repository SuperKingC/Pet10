import { Text, View } from '@tarojs/components'
import type { MiniappContribution } from '../../services/socialApi'
import './MiniappContributionBoard.scss'

interface MiniappContributionBoardProps {
  contributions: MiniappContribution[]
  names: Record<string, string>
}

export function MiniappContributionBoard({ contributions, names }: MiniappContributionBoardProps) {
  const totals = contributions.reduce<Record<string, number>>((result, item) => {
    result[item.userId] = (result[item.userId] ?? 0) + item.count
    return result
  }, {})
  const leaderboard = Object.entries(totals).sort((first, second) => second[1] - first[1])

  if (leaderboard.length === 0) return null

  return (
    <View className="miniapp-contribution-board">
      <View className="miniapp-contribution-board__header">
        <Text className="miniapp-contribution-board__title">双方贡献榜</Text>
        <Text className="miniapp-contribution-board__caption">一起照顾小多利的每个动作</Text>
      </View>
      {leaderboard.map(([userId, count], index) => (
        <View className="miniapp-contribution-board__row" key={userId}>
          <Text className="miniapp-contribution-board__rank">{index === 0 ? '1' : `${index + 1}`}</Text>
          <Text className="miniapp-contribution-board__name">{names[userId] ?? '共同照顾者'}</Text>
          <Text className="miniapp-contribution-board__count">{count} 次照顾</Text>
        </View>
      ))}
    </View>
  )
}
