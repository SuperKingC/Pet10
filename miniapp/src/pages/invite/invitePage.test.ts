import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const invitePagePath = path.resolve(__dirname, 'invite.tsx')

describe('invite page', () => {
  it('logs in silently on load instead of asking for a manual tap', () => {
    const source = fs.readFileSync(invitePagePath, 'utf8')

    expect(source).toContain('if (token) void openInvitation(token)')
    expect(source).toContain('authApi.loginWithWechat()')
    expect(source).not.toContain('微信登录后查看邀请')
  })

  it('keeps a retry entry so a failure is never a dead end', () => {
    const source = fs.readFileSync(invitePagePath, 'utf8')

    expect(source).toContain("'重试'")
    expect(source).toContain('setFailed(true)')
  })

  it('does not hide the page behind the loading guard once a load failed', () => {
    const source = fs.readFileSync(invitePagePath, 'utf8')

    expect(source).toContain('viewerType === null && !failed)) return null')
  })
})
