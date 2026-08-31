import { readFile, writeFile } from 'node:fs/promises'
import { extname, resolve } from 'node:path'

// AI 生图统一入口（规则见 .agents/rules/ai-image-generation.md）。
// 模型固定 openai/gpt-5.4-image-2；key 只从本地读取（环境变量 AI_IMAGE_API_KEY，
// 或 ZCode 配置 C:/Users/admin/.zcode/v2/config.json 里 baseURL 含 apirouter.zhiqiteai.cn
// 的 provider），禁止写进代码、仓库或日志。
// 用法：node scripts/gen-ai-image.mjs "提示词" [-o 输出.png] [--ratio 1:1|2:3|3:2] [--ref 图1,图2] [--image-size 2K]

const MODEL = 'openai/gpt-5.4-image-2'
const DEFAULT_BASE_URL = 'https://apirouter.zhiqiteai.cn/ApiRouterServ/v1'
const RATIOS = new Set(['1:1', '2:3', '3:2'])
const REF_MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }
const MAX_REF_BYTES = 2 * 1024 * 1024

function parseArgs(argv) {
  const promptParts = []
  const refs = []
  let output = null
  let ratio = '1:1'
  let imageSize = '2K'
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '-o') output = resolve(argv[++i])
    else if (arg === '--ratio') ratio = argv[++i]
    else if (arg === '--image-size') imageSize = argv[++i]
    else if (arg === '--ref') refs.push(...String(argv[++i]).split(',').filter(Boolean))
    else promptParts.push(arg)
  }
  const prompt = promptParts.join(' ').trim()
  if (!prompt) throw new Error('缺少提示词：node scripts/gen-ai-image.mjs "提示词" [-o 输出.png]')
  if (!RATIOS.has(ratio)) throw new Error(`--ratio 只支持 ${[...RATIOS].join('/')}`)
  return { prompt, output, ratio, imageSize, refs }
}

async function loadCredentials() {
  if (process.env.AI_IMAGE_API_KEY) return { apiKey: process.env.AI_IMAGE_API_KEY, baseURL: process.env.AI_IMAGE_BASE_URL || DEFAULT_BASE_URL }
  const configPath = 'C:/Users/admin/.zcode/v2/config.json'
  const config = JSON.parse(await readFile(configPath, 'utf8'))
  for (const provider of Object.values(config.provider ?? {})) {
    const options = provider?.options ?? {}
    if (typeof options.baseURL === 'string' && options.baseURL.includes('apirouter.zhiqiteai.cn') && options.apiKey) {
      return { apiKey: options.apiKey, baseURL: options.baseURL.replace(/\/$/, '') }
    }
  }
  throw new Error(`未找到中转 key：设 AI_IMAGE_API_KEY 环境变量，或确认 ${configPath} 里有 zhiqiteai provider`)
}

async function toRefDataUrl(path) {
  const bytes = await readFile(path)
  if (bytes.length > MAX_REF_BYTES) throw new Error(`参考图超限(≤2MB)：${path}`)
  const mime = REF_MIME[extname(path).toLowerCase()]
  if (!mime) throw new Error(`参考图只支持 jpg/png/webp：${path}`)
  return `data:${mime};base64,${bytes.toString('base64')}`
}

async function saveImage(url, output) {
  const dataUrl = /^data:image\/[^;]+;base64,(.+)$/s.exec(url)
  const bytes = dataUrl ? Buffer.from(dataUrl[1], 'base64') : Buffer.from(await (await fetch(url)).arrayBuffer())
  const path = output ?? `ai-image-${Date.now()}.png`
  await writeFile(path, bytes)
  return { path, bytes: bytes.length }
}

const { prompt, output, ratio, imageSize, refs } = parseArgs(process.argv.slice(2))
const { apiKey, baseURL } = await loadCredentials()
const content = refs.length === 0 ? prompt : [{ type: 'text', text: prompt }, ...(await Promise.all(refs.map(toRefDataUrl))).map(url => ({ type: 'image_url', image_url: { url } }))]
const startedAt = Date.now()
const response = await fetch(`${baseURL}/chat/completions`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
  body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content }], modalities: ['image'], image_config: { aspect_ratio: ratio, image_size: imageSize } })
})
const payload = await response.json().catch(() => null)
if (payload?.error) { console.error('上游错误:', JSON.stringify(payload.error).slice(0, 500)); process.exit(1) }
if (!response.ok) { console.error('HTTP', response.status, JSON.stringify(payload).slice(0, 500)); process.exit(1) }
const url = payload?.choices?.[0]?.message?.images?.[0]?.image_url?.url
if (!url) { console.error('响应里没有图片:', JSON.stringify(payload).slice(0, 500)); process.exit(1) }
const { path, bytes } = await saveImage(url, output)
if (payload.usage?.cost !== undefined) console.log('cost:', payload.usage.cost)
console.log(`已保存 ${path}（${(bytes / 1024).toFixed(1)} KB，耗时 ${Math.round((Date.now() - startedAt) / 1000)}s）`)
