import { Image, Text, View } from '@tarojs/components'
import './MiniappTabBar.scss'

const journalIcon = require('../assets/navigation/journal.png')
const meIcon = require('../assets/navigation/me.png')
const messagesIcon = require('../assets/navigation/messages.png')
const nestIcon = require('../assets/navigation/nest.png')
const pawIcon = require('../assets/navigation/paw.png')

export type MiniappTab = 'nest' | 'calendar' | 'messages' | 'me'

interface MiniappTabBarProps {
  active: MiniappTab
  unreadCount?: number
  /** 全屏页（如聊天页）打开时隐藏整个 tab 栏 */
  hidden?: boolean
  onChange(tab: MiniappTab): void
  onOpenPawMenu(): void
}

const tabs: Array<{ key: MiniappTab; label: string; icon: string }> = [
  { key: 'nest', label: '小窝', icon: nestIcon },
  { key: 'calendar', label: '小记', icon: journalIcon },
  { key: 'messages', label: '消息', icon: messagesIcon },
  { key: 'me', label: '我的', icon: meIcon },
]

export function MiniappTabBar({ active, unreadCount = 0, hidden = false, onChange, onOpenPawMenu }: MiniappTabBarProps) {
  if (hidden) return null
  return (
    <View className="miniapp-tab-bar">
      <View className="miniapp-tab-bar__background" />
      <View className="miniapp-tab-bar__items">
        {tabs.slice(0, 2).map((tab) => (
          <View
            key={tab.key}
            className={active === tab.key ? 'miniapp-tab miniapp-tab--active' : 'miniapp-tab'}
            hoverClass="none"
            hoverStartTime={0}
            hoverStayTime={0}
            onClick={() => onChange(tab.key)}
          >
            <Image className="miniapp-tab__icon" src={tab.icon} mode="aspectFit" fadeIn={false} />
            <Text>{tab.label}</Text>
          </View>
        ))}
        <View
          className="miniapp-tab miniapp-tab--paw"
          hoverClass="none"
          hoverStartTime={0}
          hoverStayTime={0}
          onClick={onOpenPawMenu}
        >
          <Image className="miniapp-tab__paw" src={pawIcon} mode="aspectFit" fadeIn={false} />
        </View>
        {tabs.slice(2).map((tab) => (
          <View
            key={tab.key}
            className={active === tab.key ? 'miniapp-tab miniapp-tab--active' : 'miniapp-tab'}
            hoverClass="none"
            hoverStartTime={0}
            hoverStayTime={0}
            onClick={() => onChange(tab.key)}
          >
            <Image className="miniapp-tab__icon" src={tab.icon} mode="aspectFit" fadeIn={false} />
            <Text>{tab.label}</Text>
            {tab.key === 'messages' && unreadCount > 0 && <Text className="miniapp-tab__badge">{unreadCount}</Text>}
          </View>
        ))}
      </View>
    </View>
  )
}
