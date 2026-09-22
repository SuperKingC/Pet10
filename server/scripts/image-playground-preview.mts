// 本地验收脚本：只挂载生图相关路由（不依赖本地 Postgres），用于在浏览器里验收工作台页面。
// 用法：npm run preview:playground --prefix server（或在 server/ 下 npx tsx scripts/image-playground-preview.mts）
// 打开 http://localhost:8791/image-playground，邀请码默认 localtest（可用 PLAYGROUND_INVITE 覆盖）。
// 上游 key 读取顺序：AI_IMAGE_API_KEY 环境变量 → ZCode 配置里 zhiqiteai provider；没有 key 时页面可看，生成会报上游不可用。
import { readFile } from 'node:fs/promises'
import express from 'express'
import { createImageRoutes } from '../src/http/imageRoutes.js'
import { createImagePlaygroundRoutes } from '../src/http/imagePlaygroundRoutes.js'

const zcodeConfigPath = 'C:/Users/admin/.zcode/v2/config.json'
let upstreamApiKey = process.env.AI_IMAGE_API_KEY ?? ''
if (!upstreamApiKey) {
  try {
    const zcodeConfig = JSON.parse(await readFile(zcodeConfigPath, 'utf8'))
    for (const provider of Object.values(zcodeConfig.provider ?? {})) {
      const options = provider?.options ?? {}
      if (typeof options.baseURL === 'string' && options.baseURL.includes('apirouter.zhiqiteai.cn') && options.apiKey) upstreamApiKey = options.apiKey
    }
  } catch {
    // 没有 ZCode 配置也能跑：页面可验收，生成会提示上游不可用
  }
}

const port = Number(process.env.PLAYGROUND_PORT ?? 8791)
const app = express()
app.use('/api/images', express.json({ limit: '6mb' }), createImageRoutes({
  image: {
    inviteCode: process.env.PLAYGROUND_INVITE ?? 'localtest',
    upstreamBaseUrl: process.env.AI_IMAGE_BASE_URL ?? 'https://apirouter.zhiqiteai.cn/ApiRouterServ/v1',
    upstreamApiKey,
    rateLimitPerMinute: Number(process.env.PLAYGROUND_PER_MINUTE ?? 3),
    imageDailyLimit: Number(process.env.PLAYGROUND_IMAGE_DAILY ?? 100),
    videoDailyLimit: Number(process.env.PLAYGROUND_VIDEO_DAILY ?? 30),
    inviteMaxFailuresPerDay: Number(process.env.PLAYGROUND_MAX_FAILURES ?? 3),
    maxPromptLength: 4000,
    enabledModels: (process.env.PLAYGROUND_MODELS ?? 'openai/gpt-5.4-image-2,openai/gpt-5.5,google/gemini-3.1-flash-image-preview,google/gemini-3-pro-image-preview,kwaivgi/kling-v3.0-pro,kwaivgi/kling-v3.0-std').split(',').map(id => id.trim()).filter(Boolean),
    promptModel: process.env.PLAYGROUND_PROMPT_MODEL ?? 'openai/gpt-5.4-mini'
  }
}))
app.use('/image-playground', createImagePlaygroundRoutes())
app.listen(port, () => console.log(`工作台本地预览: http://localhost:${port}/image-playground（邀请码 ${process.env.PLAYGROUND_INVITE ?? 'localtest'}）`))
