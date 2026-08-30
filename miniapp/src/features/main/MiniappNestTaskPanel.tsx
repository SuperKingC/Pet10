import { useEffect, useState } from 'react'
import { Image, Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { MiniappBackButton } from '../../components/MiniappBackButton'
import { nestTaskApi, type NestTaskCompleteResult } from '../../services/nestTaskApi'
import {
  ITEM_NAMES,
  REPEAT_LABELS,
  REWARD_LIMITS,
  rewardSummary,
  validateTaskInput,
  type ItemId,
  type MiniappInventory,
  type MiniappNestTask,
  type NestTaskRepeat,
} from '../../domain/nestTaskModel'
import './MiniappNestTaskPanel.scss'

const itemIcon = (itemId: ItemId) => require(`../../assets/items/item-${itemId}-v1.png`)
const TASK_ICONS = ['paw', 'bone', 'bath', 'walk', 'star'] as const
const TASK_REWARDS: Array<{ itemId: ItemId; exp: number }> = [
  { itemId: 'dog_food', exp: 10 },
  { itemId: 'ball', exp: 10 },
  { itemId: 'soap', exp: 10 }
]

interface MiniappNestTaskPanelProps {
  roomId: string
  onClose(): void
  onPetUpdated?(pet: NestTaskCompleteResult['pet'], leveledUp: boolean): void
}

export function MiniappNestTaskPanel({ roomId, onClose, onPetUpdated }: MiniappNestTaskPanelProps) {
  const [tasks, setTasks] = useState<MiniappNestTask[] | null>(null)
  const [inventory, setInventory] = useState<MiniappInventory | null>(null)
  const [pouched, setPouched] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [icon, setIcon] = useState<string>('paw')
  const [repeatRule, setRepeatRule] = useState<NestTaskRepeat>('daily')
  const [reward, setReward] = useState<{ itemId: ItemId; count: number }>({ itemId: 'dog_food', count: 1 })
  const [saving, setSaving] = useState(false)
  const [completingId, setCompletingId] = useState<string | null>(null)

  useEffect(() => {
    if (!roomId) return
    setTasks(null)
    void nestTaskApi.list(roomId).then(setTasks).catch(() => setTasks([]))
    void nestTaskApi.inventory(roomId).then(setInventory).catch(() => setInventory({ items: [] }))
  }, [roomId])

  const createTask = async () => {
    if (!roomId || saving) return
    const input = {
      title: title.trim(),
      icon,
      repeatRule,
      rewardItems: reward.count > 0 ? [reward] : [],
      rewardExp: TASK_REWARDS.find((entry) => entry.itemId === reward.itemId)?.exp ?? 0
    }
    const invalid = validateTaskInput(input)
    if (invalid) {
      Taro.showToast({ title: invalid, icon: 'none' })
      return
    }
    setSaving(true)
    try {
      const created = await nestTaskApi.create(roomId, input)
      setTasks((current) => [...(current ?? []), created])
      setFormOpen(false)
      setTitle('')
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '创建失败', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  const complete = async (task: MiniappNestTask) => {
    if (!roomId || completingId) return
    setCompletingId(task.id)
    try {
      const result = await nestTaskApi.complete(roomId, task.id)
      setTasks((current) => (current ?? []).map((item) => (
        item.id === task.id ? { ...item, doneToday: true, doneByName: '我' } : item
      )))
      void nestTaskApi.inventory(roomId).then(setInventory).catch(() => undefined)
      onPetUpdated?.(result.pet, result.leveledUp)
      const gain = result.grantedItems
        .map((item) => `${ITEM_NAMES[item.itemId] ?? item.itemId}×${item.count}`)
        .join(' ')
      Taro.showToast({
        title: result.leveledUp ? `${gain}，小多利升级啦！` : `${gain}，小多利开心多了！`,
        icon: 'none'
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      Taro.showToast({ title: message.includes('already_done') ? '这个周期已经完成过啦' : '完成失败', icon: 'none' })
    } finally {
      setCompletingId(null)
    }
  }

  const archive = async (task: MiniappNestTask) => {
    if (!roomId || saving) return
    setSaving(true)
    try {
      await nestTaskApi.update(roomId, task.id, { archived: true })
      setTasks((current) => (current ?? []).filter((item) => item.id !== task.id))
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '删除失败', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  const limits = REWARD_LIMITS[repeatRule]

  return (
    <View className="nest-task-panel">
      <View className="nest-task-panel__top">
        <MiniappBackButton onClick={onClose} />
        <Text className="nest-task-panel__title">任务</Text>
      </View>
      <Text className="nest-task-panel__caption">做任务拿道具，照顾小多利全靠它们。</Text>

      {inventory && !pouched && (
        <View className="nest-task-panel__pouch">
          {inventory.items.map((item) => (
            <View className="nest-task-panel__pouch-item" key={item.itemId}>
              <Image className="nest-task-panel__pouch-icon" src={itemIcon(item.itemId)} mode="aspectFit" />
              <Text className="nest-task-panel__pouch-count">{item.name} ×{item.count}</Text>
            </View>
          ))}
        </View>
      )}

      <View className="nest-task-list">
        {tasks === null && (
          <>
            <View className="nest-task-list__skeleton" />
            <View className="nest-task-list__skeleton nest-task-list__skeleton--short" />
          </>
        )}
        {tasks !== null && tasks.length === 0 && !formOpen && (
          <View className="nest-task-list__empty">
            <Image className="nest-task-list__empty-icon" src={itemIcon('dog_food')} mode="aspectFit" />
            <Text className="nest-task-list__empty-title">还没有照顾计划</Text>
            <Text className="nest-task-list__empty-hint">添加一个任务，完成就能拿到照顾小多利的道具。</Text>
          </View>
        )}
        {tasks !== null && tasks.map((task) => (
          <View className={`nest-task-card${task.doneToday ? ' nest-task-card--done' : ''}`} key={task.id}>
            <View className="nest-task-card__icon-ring">
              <Image className="nest-task-card__reward-icon" src={itemIcon('ball')} mode="aspectFit" />
            </View>
            <View className="nest-task-card__body">
              <Text className="nest-task-card__name">{task.title}</Text>
              <Text className="nest-task-card__meta">
                {REPEAT_LABELS[task.repeatRule]} · {rewardSummary(task)}
              </Text>
            </View>
            {task.doneToday ? (
              <View className="nest-task-card__done-badge">
                <Text className="nest-task-card__done-main">已完成</Text>
                {task.doneByName && <Text className="nest-task-card__done-by">{task.doneByName}</Text>}
              </View>
            ) : (
              <View
                className="nest-task-card__complete"
                onClick={() => void complete(task)}
              >
                <Text className="nest-task-card__complete-label">
                  {completingId === task.id ? '…' : '去完成'}
                </Text>
              </View>
            )}
          </View>
        ))}
        {tasks !== null && !formOpen && (
          <View className="nest-task-list__add" onClick={() => setFormOpen(true)}>+ 添加任务</View>
        )}
      </View>

      {formOpen && (
        <View className="nest-task-form">
          <Input
            className="nest-task-form__title"
            placeholder="任务名字（20 字以内）"
            maxlength={20}
            value={title}
            onInput={(event) => setTitle(event.detail.value)}
          />
          <View className="nest-task-form__row">
            {TASK_ICONS.map((entry) => (
              <View
                key={entry}
                className={`nest-task-form__icon${icon === entry ? ' nest-task-form__icon--active' : ''}`}
                onClick={() => setIcon(entry)}
              >
                <Image src={itemIcon('soap')} mode="aspectFit" />
              </View>
            ))}
          </View>
          <View className="nest-task-form__segment">
            {(Object.keys(REPEAT_LABELS) as NestTaskRepeat[]).map((rule) => (
              <View
                key={rule}
                className={`nest-task-form__segment-cell${repeatRule === rule ? ' nest-task-form__segment-cell--active' : ''}`}
                onClick={() => {
                  setRepeatRule(rule)
                  setReward((current) => ({
                    ...current,
                    count: Math.min(current.count, REWARD_LIMITS[rule].maxPerItem)
                  }))
                }}
              >
                <Text>{REPEAT_LABELS[rule]}</Text>
              </View>
            ))}
          </View>
          <View className="nest-task-form__row">
            {TASK_REWARDS.map((entry) => (
              <View
                key={entry.itemId}
                className={`nest-task-form__reward${reward.itemId === entry.itemId ? ' nest-task-form__reward--active' : ''}`}
                onClick={() => setReward({ itemId: entry.itemId, count: 1 })}
              >
                <Image src={itemIcon(entry.itemId)} mode="aspectFit" />
                <Text>{ITEM_NAMES[entry.itemId]}×{entry.count} · 经验+{entry.exp}</Text>
              </View>
            ))}
          </View>
          <View className="nest-task-form__count">
            <Text className="nest-task-form__count-label">道具数量</Text>
            <View
              className="nest-task-form__count-btn"
              onClick={() => setReward((current) => ({ ...current, count: Math.max(1, current.count - 1) }))}
            >−</View>
            <Text className="nest-task-form__count-num">{reward.count}</Text>
            <View
              className="nest-task-form__count-btn"
              onClick={() => setReward((current) => ({ ...current, count: Math.min(limits.maxPerItem, current.count + 1) }))}
            >+</View>
            <Text className="nest-task-form__count-hint">每日最多 {limits.maxPerItem} 个</Text>
          </View>
          <View className="nest-task-form__actions">
            <View className="nest-task-form__cancel" onClick={() => setFormOpen(false)}>取消</View>
            <View
              className={`nest-task-form__save${saving ? ' nest-task-form__save--busy' : ''}`}
              onClick={() => void createTask()}
            >保存</View>
          </View>
        </View>
      )}
    </View>
  )
}
