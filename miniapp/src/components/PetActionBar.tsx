import { useEffect, useState } from 'react'
import { Image, Text, View } from '@tarojs/components'
import type { PetAction } from '../domain/types'
import { ACTION_ITEM, insufficientMessage, type MiniappInventory } from '../domain/nestTaskModel'
import { MOCK_INVENTORY } from '../domain/gmTestMode'
import { nestTaskApi } from '../services/nestTaskApi'
import './PetActionBar.scss'

type Props = {
  roomId: string
  /** GM 本地测试模式：库存用本地模拟（各 99），不请求服务端 */
  gmTest?: boolean
  onAction: (action: PetAction) => void
}
const actions: Array<[PetAction, string, string]> = [
  ['feed', '喂食', require('../assets/action-feed.png')],
  ['play', '玩耍', require('../assets/action-play.png')],
  ['clean', '清洁', require('../assets/action-clean.png')],
  ['sleep', '睡觉', require('../assets/action-sleep.png')],
]

const itemIcon = (itemId: string) => require(`../assets/items/item-${itemId}-v6.png`)

// 按钮文字已烙在图标图里，不另渲染文本，避免框下出现重复说明。
// 道具不再钉在按钮角标上（道具种类会扩展，吃/用/消耗语义各不相同）：
// 统一收进标题右侧的道具芯片栏，随库存自动增减；0 库存动作只置灰按钮，
// 不改透明度，点击提示去任务面板；睡觉免费永远可用。
export function PetActionBar({ roomId, gmTest = false, onAction }: Props) {
  const [inventory, setInventory] = useState<MiniappInventory | null>(null)

  useEffect(() => {
    if (gmTest) {
      setInventory(MOCK_INVENTORY)
      return
    }
    if (!roomId) return
    let cancelled = false
    void nestTaskApi.inventory(roomId)
      .then((result) => { if (!cancelled) setInventory(result) })
      .catch(() => { if (!cancelled) setInventory({ items: [] }) })
    return () => { cancelled = true }
  }, [roomId, gmTest])

  const countOf = (action: PetAction) => {
    const itemId = ACTION_ITEM[action]
    if (!itemId) return null
    return inventory?.items.find((item) => item.itemId === itemId)?.count ?? 0
  }

  return <View className="pet-actions-panel">
    <View className="pet-actions-head">
      <Text className="pet-actions-title">照顾小多利</Text>
      {inventory && inventory.items.length > 0 && (
        <View className="pet-actions-items">
          {inventory.items.map((item) => (
            <View
              key={item.itemId}
              className={`pet-actions-item${item.count === 0 ? ' pet-actions-item--empty' : ''}`}
            >
              <Image className="pet-actions-item-icon" src={itemIcon(item.itemId)} mode="aspectFit" />
              <Text className="pet-actions-item-count">×{item.count}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
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
          </View>
        )
      })}
    </View>
  </View>
}
