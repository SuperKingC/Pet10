import { Button, Image, Text, View } from '@tarojs/components'
import './MiniappLoginScreen.scss'

const backgroundImage = require('../../assets/login-background.jpg')

type MiniappLoginScreenProps = {
  busy: boolean
  message: string
  launchPhase: 'login' | 'preparing'
  launchProgress: number
  launchError: string
  onWechatLogin(): void
  onRetryLaunch(): void
}

// 排版一「全幅沉浸」：整页手绘背景，文字直接压在底部奶油渐变上，无卡片容器
export function MiniappLoginScreen({
  busy,
  message,
  launchPhase,
  launchProgress,
  launchError,
  onWechatLogin,
  onRetryLaunch,
}: MiniappLoginScreenProps) {
  const preparing = launchPhase === 'preparing'
  const percentage = Math.min(100, Math.max(0, Math.round(launchProgress * 100)))

  return (
    <View className={preparing ? 'miniapp-login miniapp-login--preparing' : 'miniapp-login'}>
      <Image className="miniapp-login__background" src={backgroundImage} mode="aspectFill" aria-label="小多利正在向你挥手" />
      <View className="miniapp-login__scrim" />

      <View className="miniapp-login__brand">PET10</View>

      <View className="miniapp-login__content">
        <Text className="miniapp-login__speech">
          {preparing ? '我去把小窝收拾好。' : '我等你好久啦。'}
        </Text>
        <Text className="miniapp-login__title">小多利宠物伙伴</Text>
        <Text className="miniapp-login__slogan">
          {preparing ? '马上就好，我们一会儿见。' : '见到蛋黄我会说话，见到你我会飞奔。'}
        </Text>

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
          <Button className="miniapp-login__primary" onClick={onWechatLogin} disabled={busy} loading={busy}>
            <View className="miniapp-login__primary-inner">
              <View className="miniapp-login__wechat-icon" aria-hidden>
                <View className="miniapp-login__wechat-bubble miniapp-login__wechat-bubble--big">
                  <View className="miniapp-login__wechat-eye" />
                  <View className="miniapp-login__wechat-eye" />
                </View>
                <View className="miniapp-login__wechat-bubble miniapp-login__wechat-bubble--small">
                  <View className="miniapp-login__wechat-eye" />
                  <View className="miniapp-login__wechat-eye" />
                </View>
              </View>
              <Text className="miniapp-login__primary-label">带我回家</Text>
            </View>
          </Button>
        )}
        {!preparing && <Text className="miniapp-login__hint">微信一键登录 · 和好友一起养</Text>}
      </View>

      {message && <Text className="miniapp-login__message">{message}</Text>}
    </View>
  )
}
