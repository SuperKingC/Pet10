import { Button, Image, Text, View } from '@tarojs/components'
import { MiniappBackButton } from '../../components/MiniappBackButton'
import './MiniappGamesPage.scss'

const gobangIcon = require('../../assets/navigation/gobang.png')
const puppyImage = require('../../assets/journal/puppy-cushion-v2.png')

interface MiniappGamesPageProps {
  onClose(): void
  onOpenGobang(): void
}

export function MiniappGamesPage({ onClose, onOpenGobang }: MiniappGamesPageProps) {
  return (
    <View className="miniapp-games-page">
      <View className="miniapp-games-page__header">
        <MiniappBackButton onClick={onClose} />
        <View className="miniapp-games-page__heading">
          <Text className="miniapp-games-page__title">一起玩小游戏</Text>
          <Text className="miniapp-games-page__caption">和小多利一起玩点轻松的~</Text>
        </View>
        <Image className="miniapp-games-page__puppy" src={puppyImage} mode="aspectFit" fadeIn={false} />
      </View>
      <View className="miniapp-games-page__list">
        <View className="miniapp-games-page__card">
          <View className="miniapp-games-page__card-base">
            <Image className="miniapp-games-page__card-icon" src={gobangIcon} mode="aspectFit" fadeIn={false} />
          </View>
          <View className="miniapp-games-page__card-info">
            <Text className="miniapp-games-page__card-title">五子棋</Text>
            <Text className="miniapp-games-page__card-caption">约上好友来一局，看谁先连成五子！</Text>
          </View>
          <Button className="miniapp-games-page__play" onClick={onOpenGobang}>开始游戏</Button>
        </View>
        <Text className="miniapp-games-page__more">更多游戏敬请期待😈</Text>
      </View>
    </View>
  )
}
