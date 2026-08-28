import { Image, Text, View } from '@tarojs/components'
import type { PetAction } from '../domain/types'
import './PetActionBar.scss'

type Props = { onAction: (action: PetAction) => void }
const actions: Array<[PetAction, string, string]> = [
  ['feed', '喂食', require('../assets/action-feed.webp')],
  ['play', '玩耍', require('../assets/action-play.webp')],
  ['clean', '清洁', require('../assets/action-clean.webp')],
  ['sleep', '睡觉', require('../assets/action-sleep.webp')],
]

export function PetActionBar({ onAction }: Props) {
  return <View className="pet-actions-panel">
    <Text className="pet-actions-title">照顾小多利</Text>
    <View className="pet-actions">
      {actions.map(([action, label, icon]) => <View className="pet-action-button" key={action} onClick={() => onAction(action)}>
        <Image src={icon} mode="aspectFit" />
        <Text>{label}</Text>
      </View>)}
    </View>
  </View>
}
