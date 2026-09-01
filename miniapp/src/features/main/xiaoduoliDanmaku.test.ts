import { describe, expect, it } from 'vitest'
import { DANMAKU_MAX_CONCURRENT, getDanmakuPlan, pickDanmakuText } from './xiaoduoliDanmaku'

const basePet = {
  hunger: 80,
  mood: 90,
  energy: 90,
  health: 100,
  moodLabel: 'happy' as const,
}

describe('danmaku plan', () => {
  it('goes high-frequency with burst when the pet is excited', () => {
    expect(getDanmakuPlan({ ...basePet, moodState: 'happy' })).toEqual({ active: true, intervalMs: 7000, burst: 3 })
    expect(getDanmakuPlan({ ...basePet, moodState: undefined, mood: 80 })).toEqual({ active: true, intervalMs: 7000, burst: 3 })
  })

  it('goes low-frequency when the pet is calm', () => {
    expect(getDanmakuPlan({ ...basePet, moodState: 'content', mood: 60 })).toEqual({ active: true, intervalMs: 12000, burst: 1 })
    expect(getDanmakuPlan({ ...basePet, moodState: undefined, mood: 50 })).toEqual({ active: true, intervalMs: 12000, burst: 1 })
  })

  it('stays silent when the pet is in a low mood or has pressing needs', () => {
    expect(getDanmakuPlan({ ...basePet, moodState: 'bored' }).active).toBe(false)
    expect(getDanmakuPlan({ ...basePet, moodState: 'sulky' }).active).toBe(false)
    expect(getDanmakuPlan({ ...basePet, moodState: 'angry' }).active).toBe(false)
    expect(getDanmakuPlan({ ...basePet, hunger: 10 }).active).toBe(false)
    expect(getDanmakuPlan({ ...basePet, energy: 5 }).active).toBe(false)
    expect(getDanmakuPlan({ ...basePet, health: 10 }).active).toBe(false)
    expect(getDanmakuPlan({ ...basePet, moodLabel: 'sleepy' }).active).toBe(false)
  })
})

describe('danmaku text', () => {
  it('picks from the excited pool when happy and the calm pool when content', () => {
    expect(pickDanmakuText({ ...basePet, moodState: 'happy' }, 0)).toBe('汪汪！开心到起飞～')
    expect(pickDanmakuText({ ...basePet, moodState: 'happy' }, 1)).toBe('今天也超级幸福！')
    expect(pickDanmakuText({ ...basePet, moodState: 'content', mood: 60 }, 0)).toBe('唔，晒太阳真舒服')
    expect(pickDanmakuText({ ...basePet, moodState: 'content', mood: 60 }, 1)).toBe('偷偷打个哈欠…')
  })

  it('caps concurrent danmaku to keep the scene readable', () => {
    expect(DANMAKU_MAX_CONCURRENT).toBe(5)
  })
})
