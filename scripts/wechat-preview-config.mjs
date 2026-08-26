import path from 'node:path'

export function createWechatPreviewConfig(env, cwd = process.cwd()) {
  const appId = env.WECHAT_APPID?.trim()
  const privateKeyPath = env.WECHAT_PRIVATE_KEY_PATH?.trim()
  const outputPath = env.WECHAT_PREVIEW_QR_PATH?.trim() || path.join(cwd, 'artifacts', 'wechat-preview.png')
  const description = env.WECHAT_PREVIEW_DESC?.trim() || `Pet10 preview ${env.GITHUB_SHA?.slice(0, 7) || 'local'}`

  if (!appId) {
    throw new Error('WECHAT_APPID is required')
  }

  if (!privateKeyPath) {
    throw new Error('WECHAT_PRIVATE_KEY_PATH is required')
  }

  return {
    appId,
    privateKeyPath,
    outputPath: path.resolve(cwd, outputPath),
    description,
    projectPath: path.resolve(cwd, 'miniapp', 'dist'),
  }
}
