import { Button, Image, Input, Text, View } from '@tarojs/components'
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
  onWechatNameChange(value: string): void
  onWechatAvatarChange(value: string): void
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
  onWechatNameChange,
  onWechatAvatarChange,
  onWechatLogin,
  onRetryLaunch,
}: MiniappLoginScreenProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [nameNotice, setNameNotice] = useState('')
  const preparing = launchPhase === 'preparing'
  const percentage = Math.min(100, Math.max(0, Math.round(launchProgress * 100)))

  const openWechatLogin = () => {
    setNameNotice('')
    setModalOpen(true)
  }

  const handleNameChange = (value: string) => {
    setNameNotice('')
    onWechatNameChange(value)
  }

  const confirmWechatLogin = () => {
    if (!wechatName.trim()) {
      setNameNotice('先填一下微信昵称，我才能认出你')
      return
    }
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
              <Text className="miniapp-login__progress-label">{launchError || '我叼着娃娃，在门口等你开门'}</Text>
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
            <Text className="miniapp-login__modal-copy">确认你的微信头像和昵称，小多利马上就能认出你。</Text>

            <View className="miniapp-login__profile">
              <Button
                className="miniapp-login__avatar-picker"
                openType="chooseAvatar"
                onChooseAvatar={(event) => onWechatAvatarChange(event.detail.avatarUrl)}
                aria-label="选择微信头像"
              >
                <View className="miniapp-login__avatar-frame">
                  {wechatAvatar
                    ? <Image className="miniapp-login__avatar" src={wechatAvatar} mode="aspectFill" />
                    : <Text className="miniapp-login__avatar-placeholder">选择头像</Text>}
                </View>
              </Button>
              <View className="miniapp-login__profile-copy">
                <Text className="miniapp-login__profile-label">微信资料</Text>
                <Input
                  className="miniapp-login__profile-name"
                  type="nickname"
                  value={wechatName}
                  maxlength={12}
                  placeholder="填写微信昵称"
                  onInput={(event) => handleNameChange(event.detail.value)}
                  onBlur={(event) => handleNameChange(event.detail.value)}
                />
              </View>
            </View>

            {(message || nameNotice) && <Text className="miniapp-login__modal-message">{nameNotice || message}</Text>}

            <Button
              className="miniapp-login__wechat"
              loading={busy}
              disabled={busy}
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
