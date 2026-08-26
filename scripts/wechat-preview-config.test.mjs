import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createWechatPreviewConfig } from './wechat-preview-config.mjs'

describe('createWechatPreviewConfig', () => {
  it('creates a preview configuration from CI environment variables', () => {
    expect(
      createWechatPreviewConfig(
        {
          WECHAT_APPID: ' wxf0ba7afb8efc218d ',
          WECHAT_PRIVATE_KEY_PATH: 'secrets/private.key',
          WECHAT_PREVIEW_DESC: 'mobile test',
          GITHUB_SHA: '1234567890abcdef',
        },
        'D:\\Pet10',
      ),
    ).toEqual({
      appId: 'wxf0ba7afb8efc218d',
      privateKeyPath: 'secrets/private.key',
      outputPath: path.resolve('D:\\Pet10', 'artifacts', 'wechat-preview.png'),
      description: 'mobile test',
      projectPath: path.resolve('D:\\Pet10', 'miniapp', 'dist'),
    })
  })

  it('rejects missing credentials before invoking WeChat CI', () => {
    expect(() => createWechatPreviewConfig({}, 'D:\\Pet10')).toThrow('WECHAT_APPID is required')
    expect(() => createWechatPreviewConfig({ WECHAT_APPID: 'wx123' }, 'D:\\Pet10')).toThrow(
      'WECHAT_PRIVATE_KEY_PATH is required',
    )
  })
})
