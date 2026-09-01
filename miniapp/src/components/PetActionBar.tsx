import { useCallback, useEffect, useState } from 'react'
import { Image, Text, View } from '@tarojs/components'
import type { PetAction } from '../domain/types'
import {
  ACTION_ITEM,
  FEED_ITEM_IDS,
  insufficientMessage,
  itemCount,
  ITEM_NAMES,
  type ItemId,
  type MiniappInventory
} from '../domain/nestTaskModel'
import { MOCK_INVENTORY } from '../domain/gmTestMode'
import { nestTaskApi } from '../services/nestTaskApi'
import './PetActionBar.scss'

type Props = {
  roomId: string
  /** GM 本地测试模式：库存用本地模拟（各 99），不请求服务端 */
  gmTest?: boolean
  /** feed 会带上选中的道具 id（牛奶/骨头），其余动作不带 */
  onAction: (action: PetAction, itemId?: ItemId) => void
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
// 喂食例外：点按钮先弹牛奶/骨头二选一气泡（都为 0 才算锁定），
// 气泡打开时全屏透明遮罩兜底点按关闭，打开瞬间重拉库存保证计数最新。
export function PetActionBar({ roomId, gmTest = false, onAction }: Props) {
  const [inventory, setInventory] = useState<MiniappInventory | null>(null)
  const [feedPickerOpen, setFeedPickerOpen] = useState(false)

  const refreshInventory = useCallback(() => {
    if (gmTest) {
      setInventory(MOCK_INVENTORY)
      return
    }
    if (!roomId) return
    void nestTaskApi.inventory(roomId)
      .then((result) => { setInventory(result) })
      .catch(() => { setInventory({ items: [] }) })
  }, [roomId, gmTest])

  useEffect(() => {
    refreshInventory()
  }, [refreshInventory])

  const countOf = (itemId: ItemId) => itemCount(inventory, itemId)

  const isLocked = (action: PetAction) => {
    const itemId = ACTION_ITEM[action]
    if (!itemId) return false
    // 喂食牛奶/骨头二选一：任一有货即可喂
    if (action === 'feed') return !FEED_ITEM_IDS.some((id) => countOf(id) > 0)
    return countOf(itemId) === 0
  }

  const openFeedPicker = () => {
    // 气泡内的计数要反映消耗后的最新库存（芯片栏维持既有节奏不实时刷新）
    if (!gmTest) refreshInventory()
    setFeedPickerOpen(true)
  }

  const handleButtonPress = (action: PetAction) => {
    if (isLocked(action)) {
      const { showToast } = require('@tarojs/taro')
      showToast({ title: insufficientMessage(action), icon: 'none' })
      return
    }
    if (action === 'feed') {
      openFeedPicker()
      return
    }
    onAction(action)
  }

  return <View className="pet-actions-panel">
    {feedPickerOpen && <View className="pet-actions-backdrop" onClick={() => setFeedPickerOpen(false)} />}
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
        const locked = isLocked(action)
        return (
          <View
            key={action}
            className={`pet-action-button${locked ? ' pet-action-button--locked' : ''}`}
            onClick={() => { if (!feedPickerOpen) handleButtonPress(action) }}
          >
            <Image src={icon} mode="aspectFit" />
            {action === 'feed' && feedPickerOpen && (
              <View className="pet-feed-bubble">
                {FEED_ITEM_IDS.map((itemId) => {
                  const count = countOf(itemId)
                  return (
                    <View
                      key={itemId}
                      hoverClass={count > 0 ? 'pet-feed-bubble__option--press' : ''}
                      hoverStayTime={80}
                      className={`pet-feed-bubble__option${count === 0 ? ' pet-feed-bubble__option--empty' : ''}`}
                      onClick={() => {
                        if (count <= 0) return
                        setFeedPickerOpen(false)
                        onAction('feed', itemId)
                      }}
                    >
                      <Image className="pet-feed-bubble__icon" src={itemIcon(itemId)} mode="aspectFit" />
                      <Text className="pet-feed-bubble__name">{ITEM_NAMES[itemId]}×{count}</Text>
                    </View>
                  )
                })}
                <View className="pet-feed-bubble__arrow" />
              </View>
            )}
          </View>
        )
      })}
    </View>
  </View>
}
