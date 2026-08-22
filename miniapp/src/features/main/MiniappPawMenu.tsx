import { useEffect, useRef, useState } from 'react'
import { Button, Image, Text, View } from '@tarojs/components'
import './MiniappPawMenu.scss'

const codewordIcon = require('../../assets/navigation/codeword.png')
const gameIcon = require('../../assets/navigation/game.png')
const tarotIcon = require('../../assets/navigation/tarot.png')

const CLOSE_ANIMATION_MS = 180

interface MiniappPawMenuProps {
  open: boolean
  onClose(): void
  onOpenCodeword(): void
  onOpenGames(): void
  onOpenTarot(): void
}

export function MiniappPawMenu({
  open,
  onClose,
  onOpenCodeword,
  onOpenGames,
  onOpenTarot,
}: MiniappPawMenuProps) {
  const [closing, setClosing] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (open) setClosing(false)
    return () => clearTimeout(closeTimer.current)
  }, [open])

  if (!open) return null

  function requestClose() {
    if (closing) return
    setClosing(true)
    closeTimer.current = setTimeout(() => onClose(), CLOSE_ANIMATION_MS)
  }

  return (
    <View className={`miniapp-paw-menu${closing ? ' miniapp-paw-menu--closing' : ''}`}>
      <View className="miniapp-paw-menu__backdrop" onClick={requestClose} />
      <View className="miniapp-paw-menu__sheet">
        <View className="miniapp-paw-menu__handle" />
        <View className="miniapp-paw-menu__header">
          <View>
            <Text className="miniapp-paw-menu__title">一起留下今天的脚印</Text>
            <Text className="miniapp-paw-menu__caption">今天想做点什么？</Text>
          </View>
          <Button className="miniapp-paw-menu__close" onClick={requestClose}>×</Button>
        </View>
        <View className="miniapp-paw-menu__entries">
          <Button className="miniapp-paw-menu__entry" onClick={onOpenCodeword}>
            <View className="miniapp-paw-menu__entry-base">
              <Image className="miniapp-paw-menu__entry-icon" src={codewordIcon} mode="aspectFit" fadeIn={false} />
            </View>
            <Text className="miniapp-paw-menu__entry-title">暗号</Text>
          </Button>
          <Button className="miniapp-paw-menu__entry" onClick={onOpenGames}>
            <View className="miniapp-paw-menu__entry-base">
              <Image className="miniapp-paw-menu__entry-icon" src={gameIcon} mode="aspectFit" fadeIn={false} />
            </View>
            <Text className="miniapp-paw-menu__entry-title">游戏</Text>
          </Button>
          <Button className="miniapp-paw-menu__entry" onClick={onOpenTarot}>
            <View className="miniapp-paw-menu__entry-base">
              <Image className="miniapp-paw-menu__entry-icon" src={tarotIcon} mode="aspectFit" fadeIn={false} />
            </View>
            <Text className="miniapp-paw-menu__entry-title">塔罗</Text>
          </Button>
        </View>
      </View>
    </View>
  )
}
