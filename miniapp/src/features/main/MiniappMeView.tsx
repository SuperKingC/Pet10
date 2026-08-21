import { Button, Image, Text, View } from '@tarojs/components'
import type { LaunchContext } from '../../services/launchContextApi'
import './MiniappMeView.scss'

const birthdayIcon = require('../../assets/me/birthday.png')
const notificationIcon = require('../../assets/me/notification.png')
const contactIcon = require('../../assets/me/contact.png')
const aboutIcon = require('../../assets/me/about.png')
const logoutIcon = require('../../assets/me/logout.png')
interface MiniappMeViewProps {
  context: LaunchContext | null
  onLogout(): void
}

export function MiniappMeView({ context, onLogout }: MiniappMeViewProps) {
  const displayName = context?.user.displayName || '微信用户'
  return (
    <View className="miniapp-me">
      <View className="miniapp-me__header">
        <Text className="miniapp-me__title">我的</Text>
        <Text className="miniapp-me__caption">管理你的 Pet10 资料和偏好。</Text>
      </View>
      <View className="miniapp-me__profile">
        <View className="miniapp-me__avatar"><Text>{displayName.slice(0, 1)}</Text></View>
        <View>
          <Text className="miniapp-me__name">{displayName}</Text>
          <Text className="miniapp-me__id">微信用户</Text>
        </View>
      </View>
      <View className="miniapp-me__list">
        <View className="miniapp-me__item"><Image src={birthdayIcon} mode="aspectFit" /><Text>生日</Text><Text>设置</Text></View>
        <View className="miniapp-me__item"><Image src={notificationIcon} mode="aspectFit" /><Text>消息通知</Text><Text>已开启</Text></View>
        <View className="miniapp-me__item"><Image src={contactIcon} mode="aspectFit" /><Text>联系我们</Text><Text>›</Text></View>
        <View className="miniapp-me__item"><Image src={aboutIcon} mode="aspectFit" /><Text>关于小多利</Text><Text>›</Text></View>
        <Button className="miniapp-me__logout" onClick={onLogout}><Image src={logoutIcon} mode="aspectFit" /><Text>退出登录</Text></Button>
      </View>
    </View>
  )
}
