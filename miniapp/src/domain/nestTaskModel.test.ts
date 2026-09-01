import { describe, expect, it } from 'vitest'
import {
  ACTION_ITEM,
  FEED_ITEM_IDS,
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
    rewardNames: ['牛奶'],
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
    // 喂食可选集与服务端 itemCatalog 同口径：牛奶或骨头
    expect(FEED_ITEM_IDS).toEqual(['dog_food', 'bone'])
  })

  it('counts inventory and derives action availability', () => {
    const inventory = { items: [{ itemId: 'dog_food' as const, name: '牛奶', count: 2 }] }
    expect(itemCount(inventory, 'dog_food')).toBe(2)
    expect(itemCount(inventory, 'ball')).toBe(0)
    expect(itemCount(null, 'ball')).toBe(0)
    expect(getActionAvailability('feed', inventory)).toBe('ready')
    expect(getActionAvailability('play', inventory)).toBe('missing_item')
    expect(getActionAvailability('sleep', inventory)).toBe('free')
  })

  it('treats feed as ready when either milk or bone is in stock', () => {
    // 牛奶没了但还有骨头：仍可喂（气泡里骨头可选、牛奶置灰）
    const boneOnly = { items: [{ itemId: 'bone' as const, name: '骨头', count: 1 }] }
    expect(getActionAvailability('feed', boneOnly)).toBe('ready')
    // 两样都空才算缺道具
    expect(getActionAvailability('feed', { items: [] })).toBe('missing_item')
  })

  it('summarizes rewards and insufficient messages in Chinese', () => {
    expect(rewardSummary(task({ rewardItems: [{ itemId: 'dog_food', count: 2 }] }))).toBe('牛奶×2')
    expect(rewardSummary(task({ rewardItems: [{ itemId: 'ball', count: 1 }, { itemId: 'soap', count: 1 }] }))).toBe('皮球×1 + 香皂×1')
    expect(rewardSummary(task({ rewardItems: [{ itemId: 'bone', count: 2 }] }))).toBe('骨头×2')
    expect(insufficientMessage('feed')).toContain('牛奶')
    expect(insufficientMessage('feed')).toContain('骨头')
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
