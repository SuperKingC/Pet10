import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildPreviewPlan, resolveWechatCliPath } from './miniapp-preview-local.mjs'

describe('resolveWechatCliPath', () => {
  it('returns null outside Windows', () => {
    expect(resolveWechatCliPath('linux', {})).toBeNull()
  })

  it('ignores the WECHAT_DEVTOOLS_CLI override when the file does not exist', () => {
    expect(resolveWechatCliPath('win32', { WECHAT_DEVTOOLS_CLI: 'X:/missing/cli.bat' })).toBeNull()
  })

  it('skips nonexistent candidates and falls back to null', () => {
    expect(resolveWechatCliPath('win32', { WECHAT_DEVTOOLS_CLI: 'X:/missing/cli.bat' })).toBeNull()
  })
})

describe('buildPreviewPlan', () => {
  it('defaults to check-dist + auto-preview without building', () => {
    const plan = buildPreviewPlan({ platform: 'linux', env: {} })
    expect(plan.steps.map((s) => s.name)).toEqual(['check-dist', 'auto-preview'])
  })

  it('includes clean and build steps when --build requested', () => {
    const plan = buildPreviewPlan({ platform: 'linux', env: {}, build: true })
    expect(plan.steps.map((s) => s.name)).toEqual(['clean-dist', 'build', 'check-dist', 'auto-preview'])
  })

  it('check-dist fails when dist has not been built', () => {
    const plan = buildPreviewPlan({ projectRoot: 'test-workspace', platform: 'linux', env: {} })
    const check = plan.steps.find((s) => s.name === 'check-dist').run()
    expect(check.ok).toBe(false)
    expect(check.reason).toContain('miniapp/dist/app.json 不存在')
  })

  it('auto-preview fails with a clear reason when the CLI is missing', () => {
    const plan = buildPreviewPlan({ platform: 'linux', env: {} })
    const preview = plan.steps.find((s) => s.name === 'auto-preview').run()
    expect(preview.ok).toBe(false)
    expect(preview.reason).toContain('未找到微信开发者工具 CLI')
  })
})

describe('resolveWechatCliPath against the real machine', () => {
  it('finds the devtools CLI at the known D:\\Tencent location when present', () => {
    const cli = resolveWechatCliPath()
    if (!existsSync('D:\\Tencent\\微信web开发者工具\\cli.bat')) return
    expect(cli).toContain('cli.bat')
  })
})
