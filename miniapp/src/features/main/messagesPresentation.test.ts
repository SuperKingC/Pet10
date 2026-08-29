import { describe, expect, it } from 'vitest'
import {
  getConversationPreviewText,
  getConversationRowPresentation,
  getConversationTimeLabel,
  getDayDividerLabel,
} from './messagesPresentation'

describe('conversation row presentation', () => {
  const base = {
    type: 'pair' as const,
    title: '我 × 真好友',
  }

  it('shows friend name and avatar for pair conversations with friend info', () => {
    expect(getConversationRowPresentation({
      ...base,
      friendName: '真好友',
      friendAvatarUrl: 'https://cdn.example.com/a.png',
    })).toEqual({
      name: '真好友',
      avatarUrl: 'https://cdn.example.com/a.png',
      initial: '真',
      isPet: false,
    })
  })

  it('falls back to the title initial when a pair conversation has no friend info', () => {
    expect(getConversationRowPresentation({
      ...base,
      friendName: '',
      friendAvatarUrl: null,
    })).toEqual({
      name: '我 × 真好友',
      avatarUrl: null,
      initial: '我',
      isPet: false,
    })
  })

  it('always presents pet_dm as 小多利 with the bundled pet avatar', () => {
    expect(getConversationRowPresentation({
      type: 'pet_dm',
      title: '小多利',
      friendName: '',
      friendAvatarUrl: 'https://cdn.example.com/ignored.png',
    })).toEqual({
      name: '小多利',
      avatarUrl: null,
      initial: '小',
      isPet: true,
    })
  })
})

describe('conversation preview text', () => {
  it('shows the latest text message as preview', () => {
    expect(getConversationPreviewText(
      { kind: 'text', text: '今天也要加油鸭' },
      '成为好友啦，一起照顾小多利吧',
      'pair',
    )).toBe('今天也要加油鸭')
  })

  it('maps image messages to a fixed placeholder preview', () => {
    expect(getConversationPreviewText(
      { kind: 'image', text: '' },
      '开启你们的共同聊天',
      'pair',
    )).toBe('[图片]')
  })

  it('keeps per-type default previews when a conversation has no latest message', () => {
    expect(getConversationPreviewText(undefined, '', 'pet_dm')).toBe('汪！我在呢，来找我聊天嘛～')
    expect(getConversationPreviewText(undefined, '', 'pair')).toBe('成为好友啦，一起照顾小多利吧')
    expect(getConversationPreviewText(undefined, '自定义兜底', 'pair')).toBe('自定义兜底')
  })
})

describe('conversation time label', () => {
  const now = new Date('2026-08-29T10:00:00')

  it('labels same-day timestamps as HH:mm', () => {
    expect(getConversationTimeLabel('2026-08-29T08:05:00', now)).toBe('08:05')
  })

  it('labels older timestamps as M月D日', () => {
    expect(getConversationTimeLabel('2026-07-18T08:05:00', now)).toBe('7月18日')
  })

  it('returns empty for invalid timestamps', () => {
    expect(getConversationTimeLabel('not-a-date', now)).toBe('')
  })
})

describe('chat day divider label', () => {
  const now = new Date('2026-08-29T10:00:00')

  it('labels today, yesterday and older days', () => {
    expect(getDayDividerLabel('2026-08-29T08:00:00', now)).toBe('今天')
    expect(getDayDividerLabel('2026-08-28T23:00:00', now)).toBe('昨天')
    expect(getDayDividerLabel('2026-06-01T08:00:00', now)).toBe('6月1日')
  })

  it('returns undefined for invalid or missing timestamps', () => {
    expect(getDayDividerLabel(undefined, now)).toBeUndefined()
    expect(getDayDividerLabel('garbage', now)).toBeUndefined()
  })
})
