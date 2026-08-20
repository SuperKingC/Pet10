import { Text, View } from '@tarojs/components'
import './pet.scss'

export default function Pet() {
  return (
    <View className="pet-page">
      <Text className="pet-page-title">宠物详情</Text>
      <Text className="pet-page-caption">第一阶段从首页完成宠物互动，详情页将在后续补充。</Text>
    </View>
  )
}
