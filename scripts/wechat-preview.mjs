import fs from 'node:fs/promises'
import path from 'node:path'
import { createWechatPreviewConfig } from './wechat-preview-config.mjs'

const config = createWechatPreviewConfig(process.env)
await fs.mkdir(path.dirname(config.outputPath), { recursive: true })

const ciModule = await import('miniprogram-ci')
const ci = ciModule.default ?? ciModule
const project = new ci.Project({
  appid: config.appId,
  type: 'miniProgram',
  projectPath: config.projectPath,
  privateKeyPath: path.resolve(config.privateKeyPath),
  ignores: ['node_modules/**/*'],
})

await ci.preview({
  project,
  desc: config.description,
  setting: {
    es6: true,
    minified: true,
  },
  qrcodeFormat: 'image',
  qrcodeOutputDest: config.outputPath,
})

console.log(`WeChat preview QR code: ${config.outputPath}`)
