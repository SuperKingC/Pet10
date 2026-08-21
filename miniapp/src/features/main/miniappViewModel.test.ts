import { describe, expect, it } from 'vitest'
import { getFortuneAvailability, getInvitationButtonState, getProfilePresentation, shouldShowNestFeedback } from './miniappViewModel'

describe('miniapp view model', () => {
  it('shows only active loading or actionable Pet10 feedback on the nest tab', () => {
    expect(shouldShowNestFeedback('nest', true, '')).toBe(true)
    expect(shouldShowNestFeedback('nest', false, '读取 Pet10 状态失败')).toBe(true)
    expect(shouldShowNestFeedback('nest', false, '')).toBe(false)
    expect(shouldShowNestFeedback('calendar', true, '读取 Pet10 状态失败')).toBe(false)
  })

  it('prefers the authenticated profile name and avatar', () => {
    expect(getProfilePresentation({
      displayName: '小明',
      avatarUrl: 'https://example.com/avatar.png',
    })).toEqual({
      displayName: '小明',
      avatarUrl: 'https://example.com/avatar.png',
    })
  })

  it('falls back when profile data is unavailable', () => {
    expect(getProfilePresentation(null)).toEqual({
      displayName: '微信用户',
      avatarUrl: null,
    })
  })

  it('offers a retry instead of leaving invitation permanently disabled', () => {
    expect(getInvitationButtonState(false, false)).toEqual({
      label: '重新准备邀请',
      disabled: false,
      shareReady: false,
    })
    expect(getInvitationButtonState(false, true)).toEqual({
      label: '正在准备邀请…',
      disabled: true,
      shareReady: false,
    })
    expect(getInvitationButtonState(true, false)).toEqual({
      label: '邀请好友一起养',
      disabled: false,
      shareReady: true,
    })
  })

  it('does not request fortune before a birthday is set', () => {
    expect(getFortuneAvailability(null)).toEqual({
      ready: false,
      message: '请先在“我的”中设置生日',
    })
    expect(getFortuneAvailability('1990-01-01')).toEqual({
      ready: true,
      message: '',
    })
  })
})
