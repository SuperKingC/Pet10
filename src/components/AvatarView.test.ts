import { describe, expect, it } from 'vitest'
import { createFallbackAvatarConfig } from './AvatarView'

describe('fallback friend avatar', () => {
  it('generates a stable avatar for the same user', () => {
    expect(createFallbackAvatarConfig('user-a')).toEqual(createFallbackAvatarConfig('user-a'))
  })

  it('uses the same default avatar for users without a selected avatar', () => {
    expect(createFallbackAvatarConfig('user-a')).toEqual(createFallbackAvatarConfig('user-b'))
  })
})
