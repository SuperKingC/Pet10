import { useCallback, useEffect, useState } from 'react'
import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { MiniappBackButton } from '../../components/MiniappBackButton'
import { nestTaskApi } from '../../services/nestTaskApi'
import {
  getTaskButton,
  groupTasks,
  itemCount,
  rewardSummary,
  type ItemId,
  type MiniappInventory,
  type MiniappNestTask,
} from '../../domain/nestTaskModel'
import './MiniappNestTaskPanel.scss'

const itemIcon = (itemId: ItemId) => require(`../../assets/items/item-${itemId}-v4.png`)

const POCKET_ITEMS: Array<[ItemId, number]> = [['dog_food', 0], ['ball', 0], ['soap', 0]]

interface MiniappNestTaskPanelProps {
  roomId: string
  onClose(): void
}

// 系统预设任务面板：每日任务 + 成就，用户只完成与领奖，不能创建。
// 进度由服务端从照顾动作/签到事件实时派生，面板只展示与领取。
export function MiniappNestTaskPanel({ roomId, onClose }: MiniappNestTaskPanelProps) {
  const [tasks, setTasks] = useState<MiniappNestTask[] | null>(null)
  const [inventory, setInventory] = useState<MiniappInventory | null>(null)
  const [claiming, setClaiming] = useState<string | null>(null)
  const [checkingIn, setCheckingIn] = useState(false)
  const [burst, setBurst] = useState<string | null>(null)

  const refresh = useCallback(() => {
    if (!roomId) return
    void nestTaskApi.list(roomId).then(setTasks).catch(() => setTasks([]))
    void nestTaskApi.inventory(roomId).then(setInventory).catch(() => setInventory({ items: [] }))
  }, [roomId])

  useEffect(() => {
    setTasks(null)
    refresh()
  }, [refresh])

  const claim = async (task: MiniappNestTask) => {
    if (!roomId || claiming) return
    setClaiming(task.key)
    try {
      const result = await nestTaskApi.claim(roomId, task.key)
      const gain = result.grantedItems
        .map((item) => `${item.itemId === 'dog_food' ? '狗粮' : item.itemId === 'ball' ? '皮球' : '香皂'}×${item.count}`)
        .join(' ')
      Taro.showToast({ title: `获得 ${gain}！`, icon: 'none' })
      setBurst(task.key)
      setTimeout(() => setBurst((current) => (current === task.key ? null : current)), 900)
      refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      const text = message.includes('already_claimed') ? '已经领过啦'
        : message.includes('not_complete') ? '还没完成哦'
        : message.includes('locked') ? '先完成前置任务'
        : '领取失败'
      Taro.showToast({ title: text, icon: 'none' })
    } finally {
      setClaiming(null)
    }
  }

  const checkin = async () => {
    if (!roomId || checkingIn) return
    setCheckingIn(true)
    try {
      await nestTaskApi.checkin(roomId)
      Taro.showToast({ title: '签到成功，小多利记下啦！', icon: 'none' })
      refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      Taro.showToast({ title: message.includes('already_done') ? '今天已经签过啦' : '签到失败', icon: 'none' })
    } finally {
      setCheckingIn(false)
    }
  }

  const { daily, achievement } = groupTasks(tasks ?? [])
  const loadedTasks = tasks ?? []
  const claimedCount = loadedTasks.filter((task) => task.claimed).length
  const counts: Record<ItemId, number> = {
    dog_food: itemCount(inventory, 'dog_food'),
    ball: itemCount(inventory, 'ball'),
    soap: itemCount(inventory, 'soap'),
  }
  const checkinTask = daily.find((task) => task.key === 'daily_checkin')

  const renderTask = (task: MiniappNestTask, index: number) => {
    const button = getTaskButton(task)
    const delay = Math.min(index * 70, 420)
    return (
      <View
        className={[
          'nest-task-card',
          task.scope === 'achievement' ? 'nest-task-card--achievement' : 'nest-task-card--daily',
          task.complete && !task.claimed ? ' nest-task-card--complete' : '',
        ].join(' ')}
        key={task.key}
        style={{ animationDelay: `${delay}ms` }}
      >
        <View className="nest-task-card__icon-ring">
          <Image
            className="nest-task-card__reward-icon"
            src={itemIcon((task.rewardItems[0]?.itemId ?? 'dog_food') as ItemId)}
            mode="aspectFit"
          />
        </View>
        <View className="nest-task-card__body">
          <Text className="nest-task-card__name">{task.title}</Text>
          <Text className="nest-task-card__meta">奖励 {rewardSummary(task)}</Text>
          {task.scope === 'achievement' && (
            <View className="nest-task-card__progress-bar">
              <View
                className="nest-task-card__progress-fill"
                style={{ width: `${Math.min(100, Math.round(task.progress / task.target * 100))}%` }}
              />
            </View>
          )}
          {task.scope === 'achievement' && (
            <Text className="nest-task-card__progress-num">{task.progress}/{task.target}</Text>
          )}
        </View>
        <View className="nest-task-card__action">
          {button.kind === 'claimed' && (
            <View className="nest-task-card__done-badge"><Text className="nest-task-card__done-main">已领取</Text></View>
          )}
          {button.kind === 'locked' && (
            <View className="nest-task-card__lock-badge"><Text className="nest-task-card__lock-main">未解锁</Text></View>
          )}
          {button.kind === 'claim' && (
            <View
              hoverClass="nest-task-card__claim--press"
              hoverStayTime={120}
              className={`nest-task-card__claim${claiming === task.key ? ' nest-task-card__claim--busy' : ''}`}
              onClick={() => void claim(task)}
            >
              <Text className="nest-task-card__claim-label">{claiming === task.key ? '…' : '领取'}</Text>
            </View>
          )}
          {button.kind === 'progress' && (
            <View className="nest-task-card__progress-badge">
              <Text className="nest-task-card__progress-label">{task.progress}/{task.target}</Text>
            </View>
          )}
        </View>
        {burst === task.key && (
          <View className="nest-task-card__confetti">
            {Array.from({ length: 10 }).map((_, piece) => (
              <View key={piece} className={`nest-task-card__confetti-piece nest-task-card__confetti-piece--${piece % 5}`} />
            ))}
          </View>
        )}
      </View>
    )
  }

  const renderSection = (label: string) => (
    <View className="nest-task-list__section">
      <Text className="nest-task-list__section-text">{label}</Text>
      <View className="nest-task-list__section-line" />
    </View>
  )

  return (
    <View className="nest-task-panel">
      <View className="nest-task-panel__top">
        <MiniappBackButton onClick={onClose} />
        <Text className="nest-task-panel__title">任务</Text>
      </View>
      <View className="nest-task-panel__sub">
        <Text className="nest-task-panel__caption">完成任务拿道具，道具用来照顾小多利。</Text>
        {tasks !== null && loadedTasks.length > 0 && (
          <View className="nest-task-panel__progress-chip">
            <Text>已领 {claimedCount}/{loadedTasks.length}</Text>
          </View>
        )}
      </View>

      <View className="nest-task-board">
        <View className="nest-task-board__inner">
          <View className="nest-task-board__slots">
            {POCKET_ITEMS.map(([itemId]) => (
              <View className="nest-task-board__slot" key={itemId}>
                <Image className="nest-task-board__slot-icon" src={itemIcon(itemId)} mode="aspectFit" />
                <Text className="nest-task-board__slot-count">×{counts[itemId]}</Text>
              </View>
            ))}
          </View>
          {checkinTask && (
            <View
              hoverClass="nest-task-board__checkin--press"
              hoverStayTime={120}
              className={`nest-task-board__checkin${checkinTask.complete ? ' nest-task-board__checkin--done' : ''}`}
              onClick={() => { if (!checkinTask.complete) void checkin() }}
            >
              <Text>{checkinTask.complete ? '✓ 已签到' : checkingIn ? '签到中…' : '每日签到'}</Text>
            </View>
          )}
        </View>
      </View>

      <View className="nest-task-list">
        {tasks === null && (
          <>
            <View className="nest-task-list__skeleton" />
            <View className="nest-task-list__skeleton nest-task-list__skeleton--short" />
          </>
        )}
        {tasks !== null && (
          <>
            {renderSection('🐾 每日任务')}
            {daily.map(renderTask)}
            {renderSection('🏆 成就')}
            {achievement.map(renderTask)}
          </>
        )}
      </View>
    </View>
  )
}
