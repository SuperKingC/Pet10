import { describe, expect, it } from 'vitest'
import { getFriendRequestAction, getSuggestionAction } from './addFriendPresentation'

describe('add friend presentation', () => {
  it('offers the request button only for strangers', () => {
    expect(getFriendRequestAction('none')).toEqual({
      label: '加好友',
      disabled: false,
      hint: '找到 Ta 啦，打个招呼吧'
    })
  })

  it('explains read-only states without a button', () => {
    for (const relation of ['self', 'friends', 'request_sent', 'request_received'] as const) {
      const action = getFriendRequestAction(relation)
      expect(action.label).toBe('')
      expect(action.disabled).toBe(true)
      expect(action.hint).not.toBe('')
    }
    expect(getFriendRequestAction('request_sent').hint).toContain('已发送')
    expect(getFriendRequestAction('friends').hint).toContain('已经是好友')
  })

  it('marks suggestions as sent after requesting in this session', () => {
    expect(getSuggestionAction(false)).toEqual({ label: '加好友', disabled: false })
    expect(getSuggestionAction(true)).toEqual({ label: '已申请', disabled: true })
  })
})
