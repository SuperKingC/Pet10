import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const loginScreenPath = path.resolve(__dirname, 'MiniappLoginScreen.tsx')

describe('miniapp login screen', () => {
  it('logs in with a single tap and shows no confirmation modal', () => {
    const source = fs.readFileSync(loginScreenPath, 'utf8')

    expect(source).toContain('带我回家')
    expect(source).toContain('onClick={onWechatLogin}')
    expect(source).not.toContain('温馨提示')
    expect(source).not.toContain('先让小多利认识你')
    expect(source).not.toContain('微信一键登录')
    expect(source).not.toContain('暂时不登录')
    expect(source).not.toContain('modalOpen')
  })

  it('does not promise to read the WeChat avatar or nickname', () => {
    const source = fs.readFileSync(loginScreenPath, 'utf8')

    // 微信 2022 年后无法静默读取头像昵称，登录页不再给出这个承诺
    expect(source).not.toContain('读取你的微信头像和昵称')
  })

  it('does not collect avatar or nickname on the login screen', () => {
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
