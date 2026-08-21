import { describe, expect, it } from 'vitest'
import { TAROT_SPREADS } from './tarotSpreads'

describe('miniapp tarot spreads', () => {
  it('matches the four PWA spread choices and card counts', () => {
    expect(TAROT_SPREADS).toEqual([
      {
        key: 'single',
        label: '单牌速占卜',
        description: '一张牌，快速获得今日指引',
        count: 1,
        readingMode: '聚焦回答',
      },
      {
        key: 'triple',
        label: '三牌阵',
        description: '过去 · 现在 · 未来',
        count: 3,
        readingMode: '时间线阅读',
      },
      {
        key: 'relationship',
        label: '关系三牌阵',
        description: '我 · 对方 · 关系走向',
        count: 3,
        readingMode: '关系阅读',
      },
      {
        key: 'decision',
        label: '决定五牌阵',
        description: '现状 · 选项 · 风险 · 资源 · 建议',
        count: 5,
        readingMode: '决策阅读',
      },
    ])
  })
})
