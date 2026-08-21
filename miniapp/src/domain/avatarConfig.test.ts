import { describe, expect, it } from 'vitest'
import { defaultAvatarConfig, parseAvatarConfig } from './avatarConfig'

describe('miniapp avatar config', () => {
  it('fills missing fields with compatible defaults', () => {
    expect(parseAvatarConfig('{"skin":"cocoa","eyes":"happy"}')).toEqual({
      ...defaultAvatarConfig,
      skin: 'cocoa',
      eyes: 'happy',
    })
  })

  it('falls back for invalid JSON', () => {
    expect(parseAvatarConfig('{')).toEqual(defaultAvatarConfig)
  })
})
