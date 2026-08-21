import { describe, expect, it } from 'vitest'
import { buildInvitationShare } from './invitationShare'

describe('buildInvitationShare', () => {
  it('builds a WeChat invitation path with an encoded token', () => {
    expect(buildInvitationShare('invite token', '阿布')).toEqual({
      title: '阿布邀请你一起养一只小多利',
      path: '/pages/invite/invite?token=invite%20token',
    })
  })
})
