import { readFile, writeFile, rm } from 'node:fs/promises'
import { readdir } from 'node:fs/promises'
import { extname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { readImageMetadata } from './image-metadata.mjs'

// 一次性工具：压缩 miniapp/src/assets 本地图片（大 PNG/JPG 转 WebP、过大的 WebP 重编码）。
// 默认 dry-run 只输出报告；加 --write 才落盘（替换原文件，删除被转换的旧文件）。
// 用法：npm i --no-save sharp && node scripts/optimize-miniapp-assets.mjs [--write]

const root = resolve(import.meta.dirname, '..')
const assetsRoot = resolve(root, 'miniapp/src/assets')
const write = process.argv.includes('--write')
const reportIndex = process.argv.indexOf('--report')
const reportPath = reportIndex > -1 ? resolve(process.argv[reportIndex + 1]) : null

const webpQuality = Number(process.env.MINIAPP_WEBP_QUALITY ?? 80)
const convertThreshold = 16 * 1024
const reencodeMinSaving = 0.1
const maxWidth = 1500
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

function targetPathFor(path, bytes) {
  const extension = extname(path).toLowerCase()
  if (extension === '.webp') return { action: 'reencode', target: path }
  if (extension === '.png' && bytes <= convertThreshold) return { action: 'keep', target: path }
  return { action: 'convert', target: `${path.slice(0, -extension.length)}.webp` }
}

async function encode(source, width) {
  let pipeline = sharp(source, { failOn: 'none' })
  if (width && width > maxWidth) pipeline = sharp(await pipeline.toBuffer()).resize({ width: maxWidth })
  return pipeline.webp({ quality: webpQuality, alphaQuality: 90, effort: 6 }).toBuffer()
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
let removed = 0

for (const path of files.sort()) {
  const meta = await readImageMetadata(path)
  const { action, target } = targetPathFor(path, meta.bytes)
  if (action === 'keep') {
    rows.push({ file: relative(assetsRoot, path), action, before: meta.bytes, after: meta.bytes })
    totalBefore += meta.bytes
    totalAfter += meta.bytes
    continue
  }
  const buffer = await encode(path, meta.width)
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
      await rm(path)
      removed += 1
    }
  }
}

for (const row of rows) {
  const delta = row.before === row.after ? '' : ` -> ${kb(row.after)} (${Math.round((1 - row.after / row.before) * 100)}%)`
  console.log(`${row.action.padEnd(8)} ${row.file}: ${kb(row.before)}${delta}`)
}

const distAssets = rows.reduce((sum, row) => sum + row.after, 0)
if (reportPath) {
  await writeFile(reportPath, JSON.stringify(renamed, null, 2))
  console.log(`renamed report (${renamed.length}) -> ${relative(root, reportPath)}`)
}
console.log(`\nFiles: ${rows.length}; converted: ${converted}; mode: ${write ? 'WRITE' : 'dry-run'}`)
console.log(`assets total: ${kb(totalBefore)} -> ${kb(totalAfter)} (saving ${kb(totalBefore - totalAfter)})`)
console.log(`projected package (code ~0.74MB + assets): ~${((0.74 * 1024 + distAssets / 1024) / 1024).toFixed(2)} MB`)
