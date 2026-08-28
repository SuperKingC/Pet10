import { useEffect, useState } from 'react'
import { Button, Image, Text, View } from '@tarojs/components'
import './MiniappPawMenu.scss'

const codewordIcon = require('../../assets/navigation/codeword.png')
const gameIcon = require('../../assets/navigation/game.png')
const tarotIcon = require('../../assets/navigation/tarot.png')

const CLOSE_ANIMATION_MS = 240

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
  // 根节点常驻、关闭时只隐藏：卸载/重挂根节点会触发整页节点树重新序列化与整包
  // setData，导致下拉栏背后的消息页在打开和关闭时各闪一下
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      setVisible(true)
      return
    }
    const timer = setTimeout(() => setVisible(false), CLOSE_ANIMATION_MS)
    return () => clearTimeout(timer)
  }, [open])

  const closing = !open && visible

  return (
    <View className={`miniapp-paw-menu${closing ? ' miniapp-paw-menu--closing' : ''}${visible ? '' : ' miniapp-paw-menu--hidden'}`}>
      {visible && (
        <>
          <View className="miniapp-paw-menu__backdrop" onClick={onClose} />
          <View className="miniapp-paw-menu__sheet">
            <View className="miniapp-paw-menu__handle" />
            <View className="miniapp-paw-menu__header">
              <Text className="miniapp-paw-menu__title">一起留下今天的脚印</Text>
              <Text className="miniapp-paw-menu__caption">今天想做点什么？</Text>
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
        </>
      )}
    </View>
  )
}
