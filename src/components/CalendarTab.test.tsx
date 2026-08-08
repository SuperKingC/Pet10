import { renderToStaticMarkup } from 'react-dom/server'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Fortune } from '../domain/types'
import { socialApi } from '../services/socialApi'
import { CalendarTab, FortuneEntry } from './CalendarTab'
import { TabBar } from './TabBar'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const fortune: Fortune = {
  id: 'fortune-1',
  userId: 'user-1',
  day: '2026-08-08',
  content: {
    schemaVersion: 2,
    zodiac: '狮子座',
    theme: '先整理自己的节奏，再回应外界的变化',
    overall: { rating: 4, summary: '适合稳步推进手上的安排，清晰的节奏会带来好结果。', text: '综合运势完整正文。'.repeat(20) },
    love: { rating: 3, single: '单身状态完整正文。'.repeat(12), partnered: '有伴状态完整正文。'.repeat(12) },
    study: { rating: 4, text: '学习运势完整正文。'.repeat(12) },
    work: { rating: 4, text: '工作运势完整正文。'.repeat(12) },
    wealth: { rating: 2, text: '财运完整正文。'.repeat(12) },
    health: { rating: 5, text: '健康完整正文。'.repeat(12) },
    luckyColor: { name: '雾霾蓝', hex: '#7892A8' },
    luckyNumber: 8,
    luckyPhrase: '把注意力放回能由自己决定的事情上。'
  }
}

describe('daily fortune entry', () => {
  afterEach(() => vi.restoreAllMocks())

  it('renders one compact personal summary without shared-care copy', () => {
    const markup = renderToStaticMarkup(<FortuneEntry state="ready" fortune={fortune} onOpen={vi.fn()} onRetry={vi.fn()} onSetBirthday={vi.fn()} />)

    expect(markup).toContain('今日运势')
    expect(markup).toContain('狮子座')
    expect(markup).toContain('适合稳步推进')
    expect(markup).not.toContain('共养')
    expect(markup).not.toContain('小多利')
  })

  it('asks users without a birthday to set one', () => {
    const markup = renderToStaticMarkup(<FortuneEntry state="birthday-required" onOpen={vi.fn()} onRetry={vi.fn()} onSetBirthday={vi.fn()} />)

    expect(markup).toContain('设置生日，查看今日运势')
  })

  it('renames the calendar tab to 日常', () => {
    const markup = renderToStaticMarkup(<TabBar active="calendar" onChange={vi.fn()} messageBadge={0} />)

    expect(markup).toContain('日常')
    expect(markup).not.toContain('>日历<')
  })

  it('refetches after birthday setup when the user returns to 日常', async () => {
    const getFortune = vi.spyOn(socialApi, 'getFortune')
      .mockRejectedValueOnce(new Error('birthday_required'))
      .mockResolvedValue(fortune)
    const container = document.createElement('div')
    const root = createRoot(container)
    const common = {
      messages: [], myUserId: 'user-1', friendName: '', onMoodSet: vi.fn(),
      onOpenFortune: vi.fn(), onSetBirthday: vi.fn()
    }

    await act(async () => {
      root.render(<CalendarTab {...common} active birthday={null} />)
    })
    expect(container.textContent).toContain('设置生日，查看今日运势')

    await act(async () => {
      root.render(<CalendarTab {...common} active={false} birthday="2000-08-08" />)
    })
    await act(async () => {
      root.render(<CalendarTab {...common} active birthday="2000-08-08" />)
    })

    expect(getFortune).toHaveBeenCalledTimes(2)
    expect(container.textContent).toContain('适合稳步推进')
    await act(async () => root.unmount())
  })

  it('retries on a later day after returning to the foreground even if the previous request failed', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-08T03:00:00.000Z'))
    const getFortune = vi.spyOn(socialApi, 'getFortune')
      .mockRejectedValueOnce(new Error('network_error'))
      .mockResolvedValue({ ...fortune, day: '2026-08-09' })
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      await act(async () => {
        root.render(<CalendarTab messages={[]} myUserId="user-1" friendName="" onMoodSet={vi.fn()} onOpenFortune={vi.fn()} onSetBirthday={vi.fn()} active birthday="2000-08-08" />)
      })
      expect(container.textContent).toContain('暂时无法加载')

      vi.setSystemTime(new Date('2026-08-09T03:00:00.000Z'))
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'))
      })

      expect(getFortune).toHaveBeenCalledTimes(2)
      expect(container.textContent).toContain('适合稳步推进')
    } finally {
      await act(async () => root.unmount())
      vi.useRealTimers()
    }
  })
})
