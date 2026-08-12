import { describe, expect, it } from 'vitest'
import { routeAiQuestion } from './aiRouting.js'

describe('routeAiQuestion', () => {
  it('routes casual conversation directly', () => {
    expect(routeAiQuestion('我今天有点累')).toEqual({
      mode: 'direct',
      category: 'casual',
      question: '我今天有点累',
      freshnessRequired: false
    })
  })

  it('asks for missing details before searching a vague price question', () => {
    expect(routeAiQuestion('一个相机多少钱？')).toMatchObject({
      mode: 'clarify',
      category: 'price',
      clarification: expect.stringContaining('品牌')
    })
  })

  it('searches for a complete current price question', () => {
    expect(routeAiQuestion('索尼 A7C II 全新单机身现在多少钱？')).toMatchObject({
      mode: 'search',
      category: 'price',
      freshnessRequired: true,
      searchQueries: expect.arrayContaining([
        expect.stringContaining('索尼 A7C II')
      ])
    })
  })

  it('searches version-sensitive game questions', () => {
    expect(routeAiQuestion('蛋仔派对碰碰棋 S2 赛季主流阵容详情')).toMatchObject({
      mode: 'search',
      category: 'game',
      freshnessRequired: true,
      searchQueries: expect.arrayContaining([
        expect.stringContaining('碰碰棋 S2')
      ])
    })
  })

  it('searches unfamiliar professional topics conservatively', () => {
    expect(routeAiQuestion('2026 年最新的某某行业规范怎么执行？')).toMatchObject({
      mode: 'search',
      category: 'professional',
      freshnessRequired: true
    })
  })
})
