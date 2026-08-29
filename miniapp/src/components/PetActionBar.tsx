import { Image, Text, View } from '@tarojs/components'
import type { PetAction } from '../domain/types'
import './PetActionBar.scss'

type Props = { onAction: (action: PetAction) => void }
const actions: Array<[PetAction, string, string]> = [
  ['feed', '喂食', require('../assets/action-feed.png')],
  ['play', '玩耍', require('../assets/action-play.png')],
  ['clean', '清洁', require('../assets/action-clean.png')],
  ['sleep', '睡觉', require('../assets/action-sleep.png')],
]

// 按钮文字已烙在图标图里，不另渲染文本，避免框下出现重复说明
export function PetActionBar({ onAction }: Props) {
  return <View className="pet-actions-panel">
    <Text className="pet-actions-title">照顾小多利</Text>
    <View className="pet-actions">
      {actions.map(([action, , icon]) => <View className="pet-action-button" key={action} onClick={() => onAction(action)}>
        <Image src={icon} mode="aspectFit" />
      </View>)}
    </View>
  </View>
}
