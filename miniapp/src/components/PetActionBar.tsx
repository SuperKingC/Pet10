import { useEffect, useState } from 'react'
import { Image, Text, View } from '@tarojs/components'
import type { PetAction } from '../domain/types'
import { ACTION_ITEM, insufficientMessage, type MiniappInventory } from '../domain/nestTaskModel'
import { nestTaskApi } from '../services/nestTaskApi'
import './PetActionBar.scss'

type Props = {
  roomId: string
  onAction: (action: PetAction) => void
}
const actions: Array<[PetAction, string, string]> = [
  ['feed', '喂食', require('../assets/action-feed.png')],
  ['play', '玩耍', require('../assets/action-play.png')],
  ['clean', '清洁', require('../assets/action-clean.png')],
  ['sleep', '睡觉', require('../assets/action-sleep.png')],
]

const itemIcon = (itemId: string) => require(`../assets/items/item-${itemId}-v1.png`)

// 按钮文字已烙在图标图里，不另渲染文本，避免框下出现重复说明。
// v2 起喂食/玩耍/清洁消耗道具：按钮右上角显示库存角标，0 库存灰置，
// 点击提示去任务面板；睡觉免费永远可用。
export function PetActionBar({ roomId, onAction }: Props) {
  const [inventory, setInventory] = useState<MiniappInventory | null>(null)

  useEffect(() => {
    if (!roomId) return
    let cancelled = false
    void nestTaskApi.inventory(roomId)
      .then((result) => { if (!cancelled) setInventory(result) })
      .catch(() => { if (!cancelled) setInventory({ items: [] }) })
    return () => { cancelled = true }
  }, [roomId])

  const countOf = (action: PetAction) => {
    const itemId = ACTION_ITEM[action]
    if (!itemId) return null
    return inventory?.items.find((item) => item.itemId === itemId)?.count ?? 0
  }

  return <View className="pet-actions-panel">
    <Text className="pet-actions-title">照顾小多利</Text>
    <View className="pet-actions">
      {actions.map(([action, , icon]) => {
        const count = countOf(action)
        const locked = count === 0
        return (
          <View
            key={action}
            className={`pet-action-button${locked ? ' pet-action-button--locked' : ''}`}
            onClick={() => {
              if (locked) {
                const { showToast } = require('@tarojs/taro')
                showToast({ title: insufficientMessage(action), icon: 'none' })
                return
              }
              onAction(action)
            }}
          >
            <Image src={icon} mode="aspectFit" />
            {count !== null && (
              <View className={`pet-action-button__badge${locked ? ' pet-action-button__badge--empty' : ''}`}>
                <Image className="pet-action-button__badge-icon" src={itemIcon(ACTION_ITEM[action]!)} mode="aspectFit" />
                <Text className="pet-action-button__badge-count">×{count}</Text>
              </View>
            )}
          </View>
        )
      })}
    </View>
  </View>
}
