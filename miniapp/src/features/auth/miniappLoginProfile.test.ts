import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const loginScreenPath = path.resolve(__dirname, 'MiniappLoginScreen.tsx')

describe('miniapp login profile controls', () => {
  it('shows avatar picker and nickname input for manual profile entry', () => {
    const source = fs.readFileSync(loginScreenPath, 'utf8')

    expect(source).toContain('openType="chooseAvatar"')
    expect(source).toContain('type="nickname"')
    expect(source).toContain('miniapp-login__form')
    expect(source).toContain('miniapp-login__avatar-picker')
  })

  it('keeps the WeChat login button disabled until profile is provided', () => {
    const source = fs.readFileSync(loginScreenPath, 'utf8')

    expect(source).toContain('hasProfile')
    expect(source).toContain('disabled={busy || !hasProfile}')
  })
})
