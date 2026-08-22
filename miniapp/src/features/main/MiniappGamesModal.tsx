import { Button, Image, Text, View } from '@tarojs/components'
import { MiniappModal } from '../../components/MiniappModal'
import './MiniappGamesModal.scss'

const gobangIcon = require('../../assets/navigation/game.png')

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
        <Button className="miniapp-games-modal__entry" onClick={onOpenGobang}>
          <Image className="miniapp-games-modal__entry-icon" src={gobangIcon} mode="aspectFit" fadeIn={false} />
          <Text className="miniapp-games-modal__entry-name">五子棋</Text>
          <Text className="miniapp-games-modal__entry-caption">和好友下一盘五子棋</Text>
        </Button>
        <Text className="miniapp-games-modal__more">敬请期待😈</Text>
      </View>
    </MiniappModal>
  )
}
