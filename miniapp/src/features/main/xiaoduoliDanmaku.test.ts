import { describe, expect, it } from 'vitest'
import { ACTION_BURST, DANMAKU_MAX_CONCURRENT, getDanmakuPlan, pickDanmakuText } from './xiaoduoliDanmaku'

const basePet = {
  hunger: 80,
  mood: 90,
  energy: 90,
  health: 100,
  moodLabel: 'happy' as const,
}

describe('danmaku plan', () => {
  it('always stays active — every mood state gets a plan', () => {
    expect(getDanmakuPlan({ ...basePet, moodState: 'happy' }).intervalMs).toBe(7000)
    expect(getDanmakuPlan({ ...basePet, moodState: undefined, mood: 80 }).intervalMs).toBe(7000)
    expect(getDanmakuPlan({ ...basePet, moodState: 'content', mood: 60 }).intervalMs).toBe(12000)
    expect(getDanmakuPlan({ ...basePet, moodState: undefined, mood: 50 }).intervalMs).toBe(12000)
  })

  it('slow down with complaint lines when needs are pressing', () => {
    expect(getDanmakuPlan({ ...basePet, hunger: 0 }).intervalMs).toBe(10000)
    expect(getDanmakuPlan({ ...basePet, energy: 5 }).intervalMs).toBe(10000)
    expect(getDanmakuPlan({ ...basePet, health: 10 }).intervalMs).toBe(10000)
    expect(getDanmakuPlan({ ...basePet, moodLabel: 'sleepy' }).intervalMs).toBe(10000)
  })

  it('slow down further for gloomy mood-engine states', () => {
    expect(getDanmakuPlan({ ...basePet, moodState: 'bored' }).intervalMs).toBe(14000)
    expect(getDanmakuPlan({ ...basePet, moodState: 'sulky' }).intervalMs).toBe(14000)
    expect(getDanmakuPlan({ ...basePet, moodState: 'angry' }).intervalMs).toBe(14000)
  })
})

describe('danmaku text', () => {
  it('picks the excited pool when happy and the calm pool when content', () => {
    expect(pickDanmakuText({ ...basePet, moodState: 'happy' }, 0)).toBe('汪汪！开心到起飞～')
    expect(pickDanmakuText({ ...basePet, moodState: 'happy' }, 1)).toBe('今天也超级幸福！')
    expect(pickDanmakuText({ ...basePet, moodState: 'content', mood: 60 }, 0)).toBe('唔，晒太阳真舒服')
  })

  it('picks complaint lines for pressing needs and gloom', () => {
    expect(pickDanmakuText({ ...basePet, hunger: 0 }, 0)).toBe('狗盆空空，汪！')
    expect(pickDanmakuText({ ...basePet, moodLabel: 'sleepy' }, 0)).toBe('Zzz……呼噜…')
    expect(pickDanmakuText({ ...basePet, health: 10 }, 0)).toBe('有点不舒服，呜…')
    expect(pickDanmakuText({ ...basePet, energy: 5 }, 0)).toBe('跑累啦，趴一会…')
    expect(pickDanmakuText({ ...basePet, moodState: 'bored' }, 0)).toBe('好无聊呀——陪我玩！')
  })

  it('caps concurrent danmaku to keep the scene readable', () => {
    expect(DANMAKU_MAX_CONCURRENT).toBe(10)
  })

  it('bursts a ten-line stream when a care action refreshes the pet state', () => {
    expect(ACTION_BURST).toBe(10)
  })
})
