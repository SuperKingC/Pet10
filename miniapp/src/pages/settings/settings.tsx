import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { resetMockPet } from '../../services/mockPetStore'
import './settings.scss'

export default function Settings() {
  const reset = () => {
    resetMockPet()
    Taro.showToast({ title: '已恢复初始数据', icon: 'success' })
  }

  return (
    <View className="settings-page">
      <Text className="settings-title">测试设置</Text>
      <Text className="settings-caption">仅用于第一阶段 Mock 体验，不会连接真实账号。</Text>
      <Button className="reset-button" onClick={reset}>
        清除本地宠物数据
      </Button>
    </View>
  )
}
