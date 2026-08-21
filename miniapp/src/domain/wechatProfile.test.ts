import { describe, expect, it } from 'vitest'
import { normalizeWechatProfile } from './wechatProfile'

describe('WeChat profile normalization', () => {
  it('trims a confirmed nickname and keeps a selected avatar', () => {
    expect(normalizeWechatProfile({
      displayName: '  小雨  ',
      avatarUrl: 'wxfile://avatar'
    })).toEqual({
      displayName: '小雨',
      avatarUrl: 'wxfile://avatar'
    })
  })

  it('omits unconfirmed or empty profile fields', () => {
    expect(normalizeWechatProfile({
      displayName: '   ',
      avatarUrl: ''
    })).toEqual({})
  })
})
