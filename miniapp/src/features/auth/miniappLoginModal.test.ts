import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const loginScreenPath = path.resolve(__dirname, 'MiniappLoginScreen.tsx')

describe('miniapp login modal', () => {
  it('shows the warm reminder modal with pet illustration and silent one-tap login', () => {
    const source = fs.readFileSync(loginScreenPath, 'utf8')

    expect(source).toContain('温馨提示')
    expect(source).toContain('miniapp-login__modal-art')
    expect(source).toContain('先让小多利认识你')
    expect(source).toContain('读取你的微信头像和昵称，小多利马上就能认出你啦～')
    expect(source).toContain('微信一键登录')
    expect(source).toContain('暂时不登录')
  })

  it('does not collect avatar or nickname in the login modal', () => {
    const source = fs.readFileSync(loginScreenPath, 'utf8')

    expect(source).not.toContain('openType="chooseAvatar"')
    expect(source).not.toContain('type="nickname"')
    expect(source).not.toContain('hasProfile')
  })

  it('keeps the one-tap login button gated only by busy state', () => {
    const source = fs.readFileSync(loginScreenPath, 'utf8')

    expect(source).toContain('disabled={busy}')
    expect(source).not.toContain('disabled={busy || !hasProfile}')
  })
})
