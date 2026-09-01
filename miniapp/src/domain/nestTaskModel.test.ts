import { describe, expect, it } from 'vitest'
import {
  ACTION_ITEM,
  getActionAvailability,
  getTaskButton,
  groupTasks,
  insufficientMessage,
  itemCount,
  rewardSummary,
  type MiniappNestTask,
} from './nestTaskModel'

function task(overrides: Partial<MiniappNestTask>): MiniappNestTask {
  return {
    key: 'daily_feed',
    scope: 'daily',
    title: '给小多利喂食 1 次',
    icon: 'feed',
    target: 1,
    metric: 'feed',
    rewardItems: [{ itemId: 'dog_food', count: 1 }],
    rewardNames: ['狗粮'],
    progress: 0,
    complete: false,
    claimed: false,
    locked: false,
    ...overrides
  }
}

describe('nest task model (preset tasks)', () => {
  it('maps feed/play/clean to consumable items and leaves sleep free', () => {
    expect(ACTION_ITEM.feed).toBe('dog_food')
    expect(ACTION_ITEM.play).toBe('ball')
    expect(ACTION_ITEM.clean).toBe('soap')
    expect(ACTION_ITEM.sleep).toBeUndefined()
  })

  it('counts inventory and derives action availability', () => {
    const inventory = { items: [{ itemId: 'dog_food' as const, name: '狗粮', count: 2 }] }
    expect(itemCount(inventory, 'dog_food')).toBe(2)
    expect(itemCount(inventory, 'ball')).toBe(0)
    expect(itemCount(null, 'ball')).toBe(0)
    expect(getActionAvailability('feed', inventory)).toBe('ready')
    expect(getActionAvailability('play', inventory)).toBe('missing_item')
    expect(getActionAvailability('sleep', inventory)).toBe('free')
  })

  it('summarizes rewards and insufficient messages in Chinese', () => {
    expect(rewardSummary(task({ rewardItems: [{ itemId: 'dog_food', count: 2 }] }))).toBe('狗粮×2')
    expect(rewardSummary(task({ rewardItems: [{ itemId: 'ball', count: 1 }, { itemId: 'soap', count: 1 }] }))).toBe('皮球×1 + 香皂×1')
    expect(rewardSummary(task({ rewardItems: [{ itemId: 'bone', count: 2 }] }))).toBe('骨头×2')
    expect(insufficientMessage('feed')).toContain('狗粮')
  })

  it('derives the task button state by priority: claimed > locked > claim > progress', () => {
    expect(getTaskButton(task({ claimed: true })).kind).toBe('claimed')
    expect(getTaskButton(task({ locked: true })).kind).toBe('locked')
    expect(getTaskButton(task({ complete: true })).kind).toBe('claim')
    expect(getTaskButton(task({ progress: 0, target: 7 })).kind).toBe('progress')
  })

  it('groups daily above achievement', () => {
    const { daily, achievement } = groupTasks([
      task({ key: 'ach_feed_10', scope: 'achievement', title: '累计喂食 10 次', target: 10, metric: 'feed' }),
      task({ key: 'daily_checkin', title: '连续签到 1 天', metric: 'checkin' })
    ])
    expect(daily.map((item) => item.key)).toEqual(['daily_checkin'])
    expect(achievement.map((item) => item.key)).toEqual(['ach_feed_10'])
  })
})
