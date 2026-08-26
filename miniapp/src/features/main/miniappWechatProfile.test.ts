import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const meViewPath = path.resolve(__dirname, 'MiniappMeView.tsx')

describe('wechat profile completion on the me page', () => {
  it('offers the native avatar chooser', () => {
    const source = fs.readFileSync(meViewPath, 'utf8')

    expect(source).toContain('openType="chooseAvatar"')
    expect(source).toContain('onChooseAvatar')
    expect(source).toContain('saveWechatAvatar')
  })

  it('offers the native nickname input', () => {
    const source = fs.readFileSync(meViewPath, 'utf8')

    expect(source).toContain('type="nickname"')
    expect(source).toContain('saveWechatNickname')
  })

  it('persists both through the shared profile endpoint', () => {
    const source = fs.readFileSync(meViewPath, 'utf8')

    expect(source).toContain('socialApi.updateProfile({ avatarUrl: dataUrl })')
    expect(source).toContain('socialApi.updateProfile({ displayName: trimmed })')
    expect(source).toContain('wechatAvatarToDataUrl')
  })
})
