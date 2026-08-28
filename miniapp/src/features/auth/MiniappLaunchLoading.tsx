import { Button, Image, Text, View } from '@tarojs/components'
import './MiniappLaunchLoading.scss'

const petImage = require('../../assets/xiaoduoli.webp')

type MiniappLaunchLoadingProps = {
  progress: number
  error: string
  onRetry(): void
}

export function MiniappLaunchLoading({ progress, error, onRetry }: MiniappLaunchLoadingProps) {
  const percentage = Math.min(100, Math.max(0, Math.round(progress * 100)))
  return (
    <View className="miniapp-launch-loading">
      <View className="miniapp-launch-loading__pet-wrap">
        <View className="miniapp-launch-loading__ring" />
        <Image className="miniapp-launch-loading__pet" src={petImage} mode="aspectFit" />
      </View>
      <Text className="miniapp-launch-loading__kicker">正在准备</Text>
      <Text className="miniapp-launch-loading__title">我在收拾小窝，马上就好</Text>
      <Text className="miniapp-launch-loading__copy">把第一次见面需要的东西都准备好，很快就能进去啦。</Text>
      <View className="miniapp-launch-loading__bar" aria-label={`资源准备进度 ${percentage}%`}>
        <View className="miniapp-launch-loading__bar-fill" style={{ width: `${percentage}%` }} />
      </View>
      <View className="miniapp-launch-loading__meta">
        <Text>{error || '正在准备首屏资源'}</Text>
        <Text>{percentage}%</Text>
      </View>
      {error && (
        <Button className="miniapp-launch-loading__retry" onClick={onRetry}>
          重新准备
        </Button>
      )}
    </View>
  )
}
