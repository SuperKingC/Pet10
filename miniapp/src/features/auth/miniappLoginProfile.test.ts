import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const loginScreenPath = path.resolve(__dirname, 'MiniappLoginScreen.tsx')

describe('miniapp login profile controls', () => {
  it('lets the user confirm the current WeChat avatar and nickname in the login modal', () => {
    const source = fs.readFileSync(loginScreenPath, 'utf8')

    expect(source).toContain('openType="chooseAvatar"')
    expect(source).toContain('onChooseAvatar')
    expect(source).toContain('<Input')
    expect(source).toContain('type="nickname"')
    expect(source).toContain('value={wechatName}')
  })

  it('keeps the WeChat login button tappable and explains when the nickname is missing', () => {
    const source = fs.readFileSync(loginScreenPath, 'utf8')

    expect(source).toContain('onBlur')
    expect(source).not.toMatch(/disabled=\{[^}]*wechatName/)
    expect(source).toContain('先填')
  })
})
