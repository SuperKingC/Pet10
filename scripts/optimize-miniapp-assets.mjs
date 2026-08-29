import { readFile, writeFile, rm } from 'node:fs/promises'
import { readdir } from 'node:fs/promises'
import { extname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { readImageMetadata } from './image-metadata.mjs'

// 一次性工具：把 miniapp/src/assets 压缩到 iOS 安全格式。
// 微信 image 组件本地资源不解析 WebP（webp 属性"只支持网络资源"），iOS 真机不显示本地 webp，
// 因此本地包内资源策略：带透明通道 -> 256 色 PNG；不透明 -> JPEG。WebP 仅用于塔罗 COS 网络资源。
// 默认 dry-run 只输出报告；加 --write 才落盘（替换原文件，删除被转换的旧文件）。
// 用法：npm i --no-save sharp && node scripts/optimize-miniapp-assets.mjs [--write] [--report <path>]

const root = resolve(import.meta.dirname, '..')
const assetsRoot = resolve(root, 'miniapp/src/assets')
const write = process.argv.includes('--write')
const reportIndex = process.argv.indexOf('--report')
const reportPath = reportIndex > -1 ? resolve(process.argv[reportIndex + 1]) : null

const convertThreshold = 16 * 1024
const reencodeMinSaving = 0.1
const maxWidth = 1500
const jpegQuality = Number(process.env.MINIAPP_JPEG_QUALITY ?? 75)
// TinyPNG 追加压缩：256 色板/mozjpeg 落盘后再过一遍 TinyPNG，能再吃掉残留冗余（约 5~15%）。
// 需要 TINIFY_API_KEY 环境变量（https://tinypng.com/developers，免费 500 张/月）；未设置时跳过并提示。
// 输出格式不变（仍 PNG/JPEG），本地包内资源禁止转 WebP——微信 image 组件不解析本地 WebP，iOS 真机整块不显示。
const tinifyKey = process.env.TINIFY_API_KEY?.trim() || ''
let compressionCount = null // TinyPNG 响应头返回的本月已用配额
const tinifyMinSaving = 0.02 // 节省不足 2% 时保留原文件，避免无谓重写
const tinifyMaxBytes = 5 * 1024 * 1024 // TinyPNG 单张上限 5MB，包内图片远小于此
// 大背景按显示密度降采样（全宽 390pt@3x≈1170px，840px 对夜景照片足够；room 为宠物场景柔焦背景）。
const downscaleWidths = [
  { match: /xiaoduoli-street/, width: 820 },
  { match: /room-background/, width: 1152 },
]
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp'])

async function listImages(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...await listImages(path))
    else if (imageExtensions.has(extname(entry.name).toLowerCase())) files.push(path)
  }
  return files
}

async function hasAlpha(path) {
  const channels = await sharp(path).stats()
  if ((await sharp(path).metadata()).hasAlpha !== true) return false
  return channels.channels[3]?.min < 255
}

// 目标格式：webp 一律转出（iOS 真机不显示）；透明 PNG 保持 PNG（>16KB 转 256 色）；
// 不透明位图转 JPEG（照片类收益最大）。
async function targetFor(path, bytes) {
  const extension = extname(path).toLowerCase()
  if (extension === '.webp') {
    return (await hasAlpha(path))
      ? { action: 'convert', target: `${path.slice(0, -5)}.png`, format: 'png' }
      : { action: 'convert', target: `${path.slice(0, -5)}.jpg`, format: 'jpeg' }
  }
  if (extension === '.jpg' || extension === '.jpeg') {
    return { action: 'reencode', target: path, format: 'jpeg' }
  }
  if (bytes <= convertThreshold) return { action: 'keep', target: path, format: 'png' }
  return { action: 'reencode', target: path, format: 'png' }
}

async function encode(source, format, sourceBytes) {
  let pipeline = sharp(source, { failOn: 'none' })
  const meta = await pipeline.metadata()
  const downscale = downscaleWidths.find(({ match }) => match.test(source))
  if (downscale && meta.width && meta.width > downscale.width) pipeline = pipeline.resize({ width: downscale.width })
  if (format === 'png') {
    // 256 色全色板 + 误差扩散抖动：扁平图（≤256 色）像素级不变，渐变/毛发类色彩观感与原图一致。
    // 禁止再压 64/128 小色板——2026-08 验收发现整体被压灰；真彩 PNG 全量约 5.4MB 超包，此为包体约束下最接近原图的方案。
    return pipeline.png({ palette: true, quality: 100, colors: 256, effort: 10, dither: 1 }).toBuffer()
  }
  return pipeline.jpeg({ quality: jpegQuality, mozjpeg: true, chromaSubsampling: '4:4:4' }).toBuffer()
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)}K`
}

// TinyPNG 只在本地优化产物上做追加压缩：上传当前文件字节，收益达标才覆盖落盘。
// 禁止把输出转成 WebP/TinyPNG 专有格式——返回的 URL 下载回来仍是原格式。
// 注意 output.url 同样需要 API key 认证才能下载，否则拿到的是 401 XML。
async function tinifyShrink(path, bytes) {
  const auth = `Basic ${Buffer.from(`api:${tinifyKey}`).toString('base64')}`
  const response = await fetch('https://api.tinify.com/shrink', {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/octet-stream',
    },
    body: await readFile(path),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText)
    throw new Error(`TinyPNG ${response.status}: ${detail.slice(0, 200)}`)
  }
  compressionCount = response.headers.get('compression-count') ?? compressionCount
  const payload = await response.json()
  const output = payload?.output
  if (!output?.url) throw new Error('TinyPNG response missing output.url')
  const shrunkResponse = await fetch(output.url, { headers: { Authorization: auth } })
  if (!shrunkResponse.ok) throw new Error(`TinyPNG download ${shrunkResponse.status}`)
  const shrunk = await shrunkResponse.arrayBuffer()
  const after = shrunk.byteLength
  if (after >= bytes * (1 - tinifyMinSaving)) return { action: 'tinify-keep', buffer: null, after: bytes }
  return { action: 'tinify', buffer: Buffer.from(shrunk), after }
}

const files = await listImages(assetsRoot)
const rows = []
const renamed = []
let totalBefore = 0
let totalAfter = 0
let converted = 0
let tinified = 0

for (const path of files.sort()) {
  const meta = await readImageMetadata(path)
  const { action, target, format } = await targetFor(path, meta.bytes)
  if (action === 'keep' || action === 'reencode') {
    // 本地优化后仍超阈值的文件在写入模式可再过 TinyPNG；dry-run 只统计。
    if (tinifyKey && write && meta.bytes > convertThreshold && meta.bytes <= tinifyMaxBytes) {
      try {
        const shrunk = await tinifyShrink(path, meta.bytes)
        if (shrunk.buffer) {
          await writeFile(path, shrunk.buffer)
          tinified += 1
          rows.push({ file: relative(assetsRoot, path), action: 'tinify', before: meta.bytes, after: shrunk.after })
          totalBefore += meta.bytes
          totalAfter += shrunk.after
          continue
        }
      } catch (error) {
        console.warn(`WARN tinify ${relative(assetsRoot, path)}: ${error.message}`)
      }
    }
  }
  if (action === 'keep') {
    rows.push({ file: relative(assetsRoot, path), action, before: meta.bytes, after: meta.bytes })
    totalBefore += meta.bytes
    totalAfter += meta.bytes
    continue
  }
  const buffer = await encode(path, format, meta.bytes)
  if (action === 'reencode' && buffer.byteLength > meta.bytes * (1 - reencodeMinSaving)) {
    rows.push({ file: relative(assetsRoot, path), action: 'keep', before: meta.bytes, after: meta.bytes })
    totalBefore += meta.bytes
    totalAfter += meta.bytes
    continue
  }
  rows.push({ file: relative(assetsRoot, path), action, before: meta.bytes, after: buffer.byteLength })
  totalBefore += meta.bytes
  totalAfter += buffer.byteLength
  if (action === 'convert') {
    converted += 1
    renamed.push({
      from: relative(root, path).replaceAll('\\', '/'),
      to: relative(root, target).replaceAll('\\', '/'),
    })
  }
  if (write) {
    await writeFile(target, buffer)
    if (target !== path) {
      // 开发者工具开着项目时会短时锁文件：重试后仍失败则保留旧 webp（未引用文件不进包，可后续手删）。
      for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
          await rm(path)
          break
        } catch (error) {
          if (attempt === 3) console.warn(`WARN: could not remove ${relative(assetsRoot, path)}: ${error.code}`)
          else await new Promise((resolveSleep) => setTimeout(resolveSleep, 400))
        }
      }
    }
  }
}

for (const row of rows) {
  const delta = row.before === row.after ? '' : ` -> ${kb(row.after)} (${Math.round((1 - row.after / row.before) * 100)}%)`
  console.log(`${row.action.padEnd(8)} ${row.file}: ${kb(row.before)}${delta}`)
}

if (reportPath) {
  await writeFile(reportPath, JSON.stringify(renamed, null, 2))
  console.log(`renamed report (${renamed.length}) -> ${relative(root, reportPath)}`)
}
console.log(`\nFiles: ${rows.length}; converted: ${converted}; tinified: ${tinified}; mode: ${write ? 'WRITE' : 'dry-run'}`)
if (!tinifyKey) console.log('TINIFY_API_KEY not set — skipping TinyPNG pass (set it to enable the extra ~5-15% squeeze)')
else if (compressionCount !== null) console.log(`TinyPNG compression count this month: ${compressionCount} (free tier: 500)`)
console.log(`assets total: ${kb(totalBefore)} -> ${kb(totalAfter)} (saving ${kb(totalBefore - totalAfter)})`)
