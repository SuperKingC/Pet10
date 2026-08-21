import { describe, expect, it } from 'vitest'
import { avatarBackgroundOptions, avatarEyeOptions, avatarHairOptions, avatarSkinOptions } from './avatarEditorOptions'

describe('miniapp avatar editor options', () => {
  it('provides Chinese labels for text choices', () => {
    expect(avatarHairOptions.every((option) => option.label && !/^[a-z]+$/i.test(option.label))).toBe(true)
    expect(avatarEyeOptions.every((option) => option.label && !/^[a-z]+$/i.test(option.label))).toBe(true)
  })

  it('keeps every color option visible and selectable', () => {
    expect(avatarSkinOptions).toHaveLength(5)
    expect(avatarBackgroundOptions).toHaveLength(6)
    expect(avatarSkinOptions.every((option) => option.color.startsWith('#'))).toBe(true)
    expect(avatarBackgroundOptions.every((option) => option.color.startsWith('#'))).toBe(true)
  })
})
