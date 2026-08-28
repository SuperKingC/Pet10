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
const pngQuality = Number(process.env.MINIAPP_PNG_QUALITY ?? 60)
const pngColors = Number(process.env.MINIAPP_PNG_COLORS ?? 128)
const jpegQuality = Number(process.env.MINIAPP_JPEG_QUALITY ?? 75)
// 大背景按显示密度降采样（全宽 390pt@3x≈1170px，840px 对夜景照片足够；room 为宠物场景柔焦背景）。
const downscaleWidths = [
  { match: /xiaoduoli-street/, width: 820 },
  { match: /room-background/, width: 1152 },
]
// 照片/毛发类图像：量化会色带、海报化，保持 128 色 + 抖动。
const photoPattern = /polaroid|xiaoduoli-body|xiaoduoli-street|room-background|^xiaoduoli\./
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
    // 照片类（柔和渐变）128 色 + 轻抖动防色带；扁平插画 64 色 + 无抖动（更小更干净）。
    const photo = photoPattern.test(source)
    const colors = photo ? pngColors : Math.min(pngColors, 64)
    const quality = photo ? pngQuality : Math.min(pngQuality, 55)
    return pipeline.png({ palette: true, quality, colors, effort: 10, dither: photo ? 0.5 : 0 }).toBuffer()
  }
  return pipeline.jpeg({ quality: jpegQuality, mozjpeg: true }).toBuffer()
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)}K`
}

const files = await listImages(assetsRoot)
const rows = []
const renamed = []
let totalBefore = 0
let totalAfter = 0
let converted = 0

for (const path of files.sort()) {
  const meta = await readImageMetadata(path)
  const { action, target, format } = await targetFor(path, meta.bytes)
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
console.log(`\nFiles: ${rows.length}; converted: ${converted}; mode: ${write ? 'WRITE' : 'dry-run'}`)
console.log(`assets total: ${kb(totalBefore)} -> ${kb(totalAfter)} (saving ${kb(totalBefore - totalAfter)})`)
