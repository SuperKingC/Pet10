import { Button, Image, Text, View } from '@tarojs/components'
import { useState } from 'react'
import './MiniappLoginScreen.scss'

const petImage = require('../../assets/xiaoduoli.png')

type MiniappLoginScreenProps = {
  busy: boolean
  message: string
  wechatName: string
  wechatAvatar: string
  launchPhase: 'login' | 'preparing'
  launchProgress: number
  launchError: string
  profileLoading: boolean
  onOpenWechatLogin(): void
  onWechatLogin(): void
  onRetryLaunch(): void
}

export function MiniappLoginScreen({
  busy,
  message,
  wechatName,
  wechatAvatar,
  launchPhase,
  launchProgress,
  launchError,
  profileLoading,
  onOpenWechatLogin,
  onWechatLogin,
  onRetryLaunch,
}: MiniappLoginScreenProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const preparing = launchPhase === 'preparing'
  const percentage = Math.min(100, Math.max(0, Math.round(launchProgress * 100)))

  const openWechatLogin = () => {
    setModalOpen(true)
    onOpenWechatLogin()
  }

  const confirmWechatLogin = () => {
    setModalOpen(false)
    onWechatLogin()
  }

  return (
    <View className={preparing ? 'miniapp-login miniapp-login--preparing' : 'miniapp-login'}>
      <View className="miniapp-login__scene" aria-label="小多利正在向你挥手">
        <Text className="miniapp-login__speech">
          {preparing ? '我去把小窝收拾好。' : '我等你好久啦。'}
        </Text>
        <View className="miniapp-login__art">
          <View className="miniapp-login__sun" />
          <View className="miniapp-login__halo" />
          <Image className="miniapp-login__pet" src={petImage} mode="aspectFit" />
          <View className="miniapp-login__ground" />
          <View className="miniapp-login__spark miniapp-login__spark--one">✦</View>
          <View className="miniapp-login__spark miniapp-login__spark--two">✦</View>
        </View>
      </View>

      <View className="miniapp-login__copy">
        <Text className="miniapp-login__companion">
          {preparing ? '马上就好，我们一会儿见。' : '从今天开始，一起照顾小窝。'}
        </Text>
      </View>

      <View className="miniapp-login__actions">
        {preparing ? (
          <View className="miniapp-login__progress-wrap">
            <View className="miniapp-login__progress-bar" aria-label={'资源准备进度 ' + percentage + '%'}>
              <View className="miniapp-login__progress-fill" style={{ width: percentage + '%' }} />
            </View>
            <View className="miniapp-login__progress-meta">
              <Text className="miniapp-login__progress-label">{launchError || '小多利正在准备小窝'}</Text>
              <Text>{percentage}%</Text>
            </View>
            {launchError && !busy && (
              <Button className="miniapp-login__retry" onClick={onRetryLaunch}>
                重新准备
              </Button>
            )}
          </View>
        ) : (
          <Button className="miniapp-login__primary" onClick={openWechatLogin} disabled={busy}>
            带我回家
          </Button>
        )}
      </View>

      {message && !modalOpen && <Text className="miniapp-login__message">{message}</Text>}

      {modalOpen && (
        <View className="miniapp-login__overlay" onClick={() => !busy && setModalOpen(false)}>
          <View className="miniapp-login__modal" onClick={(event) => event.stopPropagation()}>
            <Button className="miniapp-login__close" onClick={() => setModalOpen(false)} disabled={busy} aria-label="关闭">
              ×
            </Button>
            <Text className="miniapp-login__modal-kicker">准备好了吗</Text>
            <Text className="miniapp-login__modal-title">先让小多利认识你</Text>
            <Text className="miniapp-login__modal-copy">微信登录会直接使用你的微信头像和昵称，小多利马上就能认出你。</Text>

            <View className="miniapp-login__profile">
              <View className="miniapp-login__avatar-frame">
                {wechatAvatar
                  ? <Image className="miniapp-login__avatar" src={wechatAvatar} mode="aspectFill" />
                  : <Text className="miniapp-login__avatar-placeholder">微信</Text>}
              </View>
              <View className="miniapp-login__profile-copy">
                <Text className="miniapp-login__profile-label">微信资料</Text>
                <Text className="miniapp-login__profile-name">
                  {wechatName || (profileLoading ? '正在获取微信昵称…' : '未读取到微信昵称')}
                </Text>
              </View>
            </View>

            {message && <Text className="miniapp-login__modal-message">{message}</Text>}

            <Button
              className="miniapp-login__wechat"
              loading={busy || profileLoading}
              disabled={busy || profileLoading || !wechatName}
              onClick={confirmWechatLogin}
            >
              <Text className="miniapp-login__wechat-mark">●</Text>
              微信一键登录
            </Button>
            <Button className="miniapp-login__later" onClick={() => setModalOpen(false)} disabled={busy}>
              暂时不登录
            </Button>
          </View>
        </View>
      )}
    </View>
  )
}
