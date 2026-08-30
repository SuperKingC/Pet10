import { describe, expect, it } from 'vitest'
import {
  ACTION_ITEM,
  REWARD_LIMITS,
  getActionAvailability,
  insufficientMessage,
  itemCount,
  rewardSummary,
  validateTaskInput,
} from './nestTaskModel'
import { getPetMood } from './petRules'

describe('nest task model', () => {
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
    expect(rewardSummary({ rewardItems: [{ itemId: 'dog_food', count: 2 }], rewardExp: 10 }))
      .toBe('狗粮×2 · 经验+10')
    expect(insufficientMessage('feed')).toContain('狗粮')
    expect(insufficientMessage('sleep')).toBe('不够啦，去做任务获得一些吧')
  })

  it('validates task input against repeat limits', () => {
    const base = { title: '散步', icon: 'paw', rewardItems: [{ itemId: 'dog_food' as const, count: 1 }], rewardExp: 10 }
    expect(validateTaskInput({ ...base, repeatRule: 'daily' })).toBeNull()
    expect(validateTaskInput({ ...base, repeatRule: 'daily', rewardExp: REWARD_LIMITS.daily.maxExp + 1 }))
      .toBe('奖励经验超出上限')
    expect(validateTaskInput({ ...base, repeatRule: 'daily', rewardItems: [{ itemId: 'dog_food', count: 4 }] }))
      .toBe('道具数量超出上限')
    expect(validateTaskInput({ ...base, title: '  ' })).toBe('给任务起个名字吧')
  })

  it('keeps pet mood helper importable from the same domain folder', () => {
    expect(getPetMood({ energy: 80, hunger: 80, mood: 80 })).toBe('happy')
  })
})
