import { Text, View } from '@tarojs/components'
import './room.scss'

export default function Room() {
  return (
    <View className="room-page">
      <Text className="room-title">双人共享房间</Text>
      <Text className="room-caption">第一阶段先展示入口，真实同步将在下一阶段接入 Pet10 API。</Text>
      <View className="room-card">
        <Text className="room-card-title">测试房间</Text>
        <Text className="room-card-detail">当前为本地 Mock 模式</Text>
      </View>
    </View>
  )
}
