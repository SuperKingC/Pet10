import { Button, Image, Text, View } from '@tarojs/components'
import { MiniappModal } from '../../components/MiniappModal'
import './MiniappGamesModal.scss'

const gobangIcon = require('../../assets/navigation/gobang.png')

interface MiniappGamesModalProps {
  onClose(): void
  onOpenGobang(): void
}

export function MiniappGamesModal({ onClose, onOpenGobang }: MiniappGamesModalProps) {
  return (
    <MiniappModal onClose={onClose}>
      <View className="miniapp-games-modal">
        <Text className="miniapp-games-modal__title">游戏</Text>
        <Text className="miniapp-games-modal__caption">和好友一起玩点轻松的</Text>
        <View className="miniapp-games-modal__grid">
          <Button className="miniapp-games-modal__entry" onClick={onOpenGobang}>
            <View className="miniapp-games-modal__entry-base">
              <Image className="miniapp-games-modal__entry-icon" src={gobangIcon} mode="aspectFit" fadeIn={false} />
            </View>
            <Text className="miniapp-games-modal__entry-name">五子棋</Text>
          </Button>
          <View className="miniapp-games-modal__slot" />
          <View className="miniapp-games-modal__slot" />
        </View>
        <Text className="miniapp-games-modal__more">敬请期待</Text>
      </View>
    </MiniappModal>
  )
}
