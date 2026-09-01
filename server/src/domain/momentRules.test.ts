import { describe, expect, it } from 'vitest'
import {
  canPostMoment,
  detectInterestQuestion,
  pickInterestMoment,
  pickMomentTopic,
  MOMENT_DAILY_MAX,
  MOMENT_INTEREST_DELAY_MS,
  MOMENT_INTEREST_MAX_AGE_MS,
  MOMENT_MIN_GAP_MS
} from './momentRules.js'

const HOUR_MS = 60 * 60 * 1000

/** 上海时间辅助：UTC+8 */
function shanghai(year: number, month: number, day: number, hour: number): Date {
  return new Date(Date.UTC(year, month - 1, day, hour - 8))
}

describe('moment rules', () => {
  it('posts a slot moment when inside a life slot and the dice pass', () => {
    const now = shanghai(2026, 9, 1, 8) // 上海 08:00 → morning 档
    expect(pickMomentTopic({ now, petPostTimes: [], userSilenceHours: 1, random: 0.1 })).toBe('morning')
    expect(pickMomentTopic({ now, petPostTimes: [], userSilenceHours: 1, random: 0.9 })).toBeNull()
  })

  it('does not post outside life slots', () => {
    expect(pickMomentTopic({ now: shanghai(2026, 9, 1, 10), petPostTimes: [], userSilenceHours: 1, random: 0 })).toBeNull()
    expect(pickMomentTopic({ now: shanghai(2026, 9, 1, 19), petPostTimes: [], userSilenceHours: 1, random: 0 })).toBeNull()
  })

  it('covers noon afternoon and night slots', () => {
    expect(pickMomentTopic({ now: shanghai(2026, 9, 1, 12), petPostTimes: [], userSilenceHours: 1, random: 0 })).toBe('noon')
    expect(pickMomentTopic({ now: shanghai(2026, 9, 1, 16), petPostTimes: [], userSilenceHours: 1, random: 0 })).toBe('afternoon')
    expect(pickMomentTopic({ now: shanghai(2026, 9, 1, 22), petPostTimes: [], userSilenceHours: 1, random: 0 })).toBe('night')
  })

  it('does not repeat a slot already posted today', () => {
    const now = shanghai(2026, 9, 1, 9)
    const posted = [shanghai(2026, 9, 1, 8)]
    expect(pickMomentTopic({ now, petPostTimes: posted, userSilenceHours: 1, random: 0 })).toBeNull()
  })

  it('prefers the missing topic when the owner has been silent long enough', () => {
    const now = shanghai(2026, 9, 1, 19) // 非时段档，但沉默满 24h 仍发想念帖
    expect(pickMomentTopic({ now, petPostTimes: [], userSilenceHours: 30, random: 0.99 })).toBe('missing')
  })

  it('respects the daily cap and minimum gap', () => {
    const now = shanghai(2026, 9, 1, 16)
    const fourToday = Array.from({ length: MOMENT_DAILY_MAX }, (_, index) => shanghai(2026, 9, 1, 7 + index * 2))
    expect(pickMomentTopic({ now, petPostTimes: fourToday, userSilenceHours: 30, random: 0 })).toBeNull()

    const twoHoursAgo = [new Date(now.getTime() - 2 * HOUR_MS)]
    expect(pickMomentTopic({ now, petPostTimes: twoHoursAgo, userSilenceHours: 30, random: 0 })).toBeNull()

    const threeHoursAgo = [new Date(now.getTime() - MOMENT_MIN_GAP_MS)]
    expect(pickMomentTopic({ now, petPostTimes: threeHoursAgo, userSilenceHours: 30, random: 0 })).toBe('missing')
  })

  it('canPostMoment ignores yesterday posts for the daily cap', () => {
    const now = shanghai(2026, 9, 1, 8)
    const yesterdayPosts = Array.from({ length: MOMENT_DAILY_MAX + 1 }, (_, index) => shanghai(2026, 8, 31, 8 + index))
    expect(canPostMoment(yesterdayPosts, now)).toBe(true)
  })
})

describe('interest moments', () => {
  const base = new Date('2026-08-31T10:00:00.000Z')

  function userMessage(text: string, minutesAgo: number) {
    return { text, createdAt: new Date(base.getTime() - minutesAgo * 60 * 1000) }
  }

  it('detects price and travel interest questions', () => {
    expect(detectInterestQuestion('索尼 A7C II 现在多少钱？')).toBe('price')
    expect(detectInterestQuestion('这台相机价格怎么样')).toBe('price')
    expect(detectInterestQuestion('杭州有什么好玩的景点，路线怎么安排')).toBe('travel')
    expect(detectInterestQuestion('去大理旅游一周行程怎么定')).toBe('travel')
    expect(detectInterestQuestion('我今天有点累')).toBeNull()
    expect(detectInterestQuestion('帮我写周报')).toBeNull()
  })

  it('fires a few minutes after the question was asked', () => {
    // 刚问 1 分钟：还没到延迟窗口
    expect(pickInterestMoment({
      now: base,
      userMessages: [userMessage('这个相机多少钱', 1)],
      petPostTimes: []
    })).toBeNull()
    // 问了 20 分钟：命中价格兴趣
    const decision = pickInterestMoment({
      now: base,
      userMessages: [userMessage('这个相机多少钱', 20)],
      petPostTimes: []
    })
    expect(decision).toMatchObject({ kind: 'price', question: expect.stringContaining('相机') })
  })

  it('never fires when the question is stale or already answered by a post', () => {
    // 问了 4 小时：话题凉了
    expect(pickInterestMoment({
      now: base,
      userMessages: [userMessage('这个相机多少钱', (MOMENT_INTEREST_MAX_AGE_MS + 30 * 60 * 1000) / 60_000)],
      petPostTimes: []
    })).toBeNull()
    // 问题之后已经发过宠物帖：视为已回应（天然去重）
    expect(pickInterestMoment({
      now: base,
      userMessages: [userMessage('这个相机多少钱', 30)],
      petPostTimes: [new Date(base.getTime() - 5 * 60 * 1000)]
    })).toBeNull()
  })

  it('picks the newest qualifying question and respects the daily cap', () => {
    const decision = pickInterestMoment({
      now: base,
      userMessages: [
        userMessage('杭州景点路线推荐', 60),
        userMessage('这个镜头多少钱', 20)
      ],
      petPostTimes: []
    })
    expect(decision).toMatchObject({ kind: 'price', question: expect.stringContaining('镜头') })

    const capPosts = Array.from({ length: MOMENT_DAILY_MAX }, () => new Date(base.getTime() - 4 * HOUR_MS))
    expect(pickInterestMoment({
      now: base,
      userMessages: [userMessage('这个镜头多少钱', 20)],
      petPostTimes: capPosts
    })).toBeNull()
  })

  it('interest moments bypass the 3h gap but still count toward the cap', () => {
    // 1 小时前刚发过一条宠物帖（间隔内），但兴趣帖时效优先仍可发
    const decision = pickInterestMoment({
      now: base,
      userMessages: [userMessage('去哪玩比较合适', 20)],
      petPostTimes: [new Date(base.getTime() - 1 * HOUR_MS)]
    })
    expect(decision).toMatchObject({ kind: 'travel' })
  })
})
