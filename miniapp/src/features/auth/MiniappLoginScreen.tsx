import { Button, Image, Text, View } from '@tarojs/components'
import './MiniappLoginScreen.scss'

const petImage = require('../../assets/xiaoduoli.png')

type MiniappLoginScreenProps = {
  busy: boolean
  message: string
  launchPhase: 'login' | 'preparing'
  launchProgress: number
  launchError: string
  onWechatLogin(): void
  onRetryLaunch(): void
}

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
          <Button className="miniapp-login__primary" onClick={onWechatLogin} disabled={busy} loading={busy}>
            带我回家
          </Button>
        )}
      </View>

      {message && <Text className="miniapp-login__message">{message}</Text>}

    </View>
  )
}
