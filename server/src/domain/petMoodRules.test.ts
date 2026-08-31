import { describe, expect, it } from 'vitest'
import {
  adjustMoodForChat,
  computeMoodState,
  decayMood,
  MOOD_DECAY_AFTER_MS
} from './petMoodRules.js'

describe('pet mood rules', () => {
  it('maps the numeric mood to a labeled state with caption and tone hint', () => {
    expect(computeMoodState({ mood: 90 })).toMatchObject({ key: 'happy', caption: expect.any(String) })
    expect(computeMoodState({ mood: 60 }).key).toBe('content')
    expect(computeMoodState({ mood: 40 }).key).toBe('bored')
    expect(computeMoodState({ mood: 20 }).key).toBe('sulky')
    expect(computeMoodState({ mood: 5 }).key).toBe('angry')
  })

  it('downgrades the label when the pet has been neglected', () => {
    expect(computeMoodState({ mood: 90, idleHours: 24 }).key).toBe('bored')
    expect(computeMoodState({ mood: 90, idleHours: 48 }).key).toBe('sulky')
    // 已经生气时不再被「降级」覆盖
    expect(computeMoodState({ mood: 5, idleHours: 72 }).key).toBe('angry')
    expect(computeMoodState({ mood: 90, idleHours: 0 }).key).toBe('happy')
  })

  it('decays mood in steps after the idle threshold with a floor', () => {
    expect(decayMood(80, MOOD_DECAY_AFTER_MS - 1)).toBe(80)
    expect(decayMood(80, MOOD_DECAY_AFTER_MS)).toBe(75)
    expect(decayMood(12, MOOD_DECAY_AFTER_MS)).toBe(10)
    expect(decayMood(10, MOOD_DECAY_AFTER_MS)).toBe(10)
  })

  it('adjusts mood from chat keywords with praise and scold', () => {
    expect(adjustMoodForChat(80, '小多利你真棒！')).toBe(82)
    expect(adjustMoodForChat(80, '笨狗，不理你了')).toBe(77)
    // 同句既有夸又嫌弃时，嫌弃优先
    expect(adjustMoodForChat(80, '真棒是假的你真讨厌')).toBe(77)
    expect(adjustMoodForChat(80, '今天天气不错')).toBe(80)
    expect(adjustMoodForChat(99, '爱你爱你')).toBe(100)
    expect(adjustMoodForChat(1, '讨厌讨厌讨厌')).toBe(0)
  })
})
