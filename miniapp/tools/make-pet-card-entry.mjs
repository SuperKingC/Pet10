// 小多利名牌入口小卡出件：design-assets/nest 的白底 AI 源图 → 归档 2048 宽 JPEG（删 raw PNG 以免 check-assets 缺登记）
// → solid 模式去底（四边洪水填充近白 + 封闭近白保护 + 贴边软 alpha）→ 内容紧裁 → 360 宽（显示 120rpx 的 3x）+ 缩放后轻锐化
//   → PNG8 + TinyPNG → public/wardrobe/pet-card-entry-v3.png（COS，不占包体）。去底策略沿用 make-item-icons-v5.mjs。
// 运行：node miniapp/tools/make-pet-card-entry.mjs
import { readFile, writeFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(import.meta.dirname, '../..')
const srcDir = path.join(root, 'design-assets/nest')
const outDir = path.join(root, 'public/wardrobe')
const OUT_VERSION = 'v3'
// 显示 120rpx≈60 逻辑 px，出 3x（180 物理 px）宽即 360；超采样过多反而被渲染端双线性平均得发糊
const OUT_WIDTH = 360

const isNearWhite = (r, g, b) => r >= 246 && g >= 244 && b >= 242

function floodBackground(data, W, H) {
  const bg = new Uint8Array(W * H)
  const q = []
  const tryPush = (x, y) => {
    const m = y * W + x
    if (bg[m]) return
    const o = m * 4
    if (isNearWhite(data[o], data[o + 1], data[o + 2])) { bg[m] = 1; q.push(m) }
  }
  for (let x = 0; x < W; x++) { tryPush(x, 0); tryPush(x, H - 1) }
  for (let y = 0; y < H; y++) { tryPush(0, y); tryPush(W - 1, y) }
  while (q.length) {
    const m = q.pop()
    const x = m % W, y = Math.floor(m / W)
    if (x > 0) tryPush(x - 1, y)
    if (x < W - 1) tryPush(x + 1, y)
    if (y > 0) tryPush(x, y - 1)
    if (y < H - 1) tryPush(x, y + 1)
  }
  return bg
}

function unmixOverWhite(data, o) {
  const minC = Math.min(data[o], data[o + 1], data[o + 2])
  const a = 255 - minC
  if (a <= 0) return [255, 255, 255, 0]
  const k = 255 / a
  return [
    Math.max(0, Math.min(255, Math.round((data[o] - (255 - a)) * k))),
    Math.max(0, Math.min(255, Math.round((data[o + 1] - (255 - a)) * k))),
    Math.max(0, Math.min(255, Math.round((data[o + 2] - (255 - a)) * k))),
    a
  ]
}

function dilate(bg, W, H, n) {
  let cur = Uint8Array.from(bg)
  for (let step = 0; step < n; step++) {
    const next = Uint8Array.from(cur)
    for (let m = 0; m < W * H; m++) {
      if (cur[m]) continue
      const x = m % W, y = Math.floor(m / W)
      if ((x > 0 && cur[m - 1]) || (x < W - 1 && cur[m + 1]) || (y > 0 && cur[m - W]) || (y < H - 1 && cur[m + W])) next[m] = 1
    }
    cur = next
  }
  return cur
}

function applySolid(data, W, H, bg) {
  const out = Buffer.from(data)
  const edge1 = dilate(bg, W, H, 1)
  for (let m = 0; m < W * H; m++) {
    const o = m * 4
    const r = data[o], g = data[o + 1], b = data[o + 2]
    const minC = Math.min(r, g, b)
    if (bg[m]) { const [nr, ng, nb, na] = unmixOverWhite(data, o); out[o] = nr; out[o + 1] = ng; out[o + 2] = nb; out[o + 3] = na; continue }
    if (!edge1[m] && isNearWhite(r, g, b)) { out[o + 3] = 255; continue }
    if (edge1[m] && minC >= 200) { const [nr, ng, nb, na] = unmixOverWhite(data, o); out[o] = nr; out[o + 1] = ng; out[o + 2] = nb; out[o + 3] = na; continue }
    out[o + 3] = 255
  }
  return out
}

function alphaBox(data, W, H, pad) {
  let minX = W, minY = H, maxX = -1, maxY = -1
  for (let m = 0; m < W * H; m++) {
    if (data[m * 4 + 3] <= 8) continue
    const x = m % W, y = Math.floor(m / W)
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
  }
  if (maxX < 0) throw new Error('empty alpha')
  const left = Math.max(0, minX - pad)
  const top = Math.max(0, minY - pad)
  return {
    left,
    top,
    width: Math.min(W, maxX + 1 + pad) - left,
    height: Math.min(H, maxY + 1 + pad) - top
  }
}

async function loadTinifyKeys() {
  try {
    const env = await readFile(path.join(root, '.env'), 'utf8')
    const values = [...env.matchAll(/^(TINIFY_API_KEY(?:_\d+)?)=(.+)$/gm)].map((m) => m[2].trim())
    return values.filter(Boolean)
  } catch {
    return []
  }
}

async function tinify(buffer, keys) {
  for (const key of keys) {
    const response = await fetch('https://api.tinify.com/shrink', {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`api:${key}`).toString('base64')}`, 'Content-Type': 'application/json' },
      body: buffer
    })
    if (response.status === 401 || response.status === 429) continue
    if (!response.ok) throw new Error(`tinify ${response.status}`)
    const { output } = await response.json()
    const shrunk = Buffer.from(await (await fetch(output.url, { headers: { Authorization: `Basic ${Buffer.from(`api:${key}`).toString('base64')}` } })).arrayBuffer())
    if (shrunk.length >= buffer.length * 0.98) return null
    return shrunk
  }
  return null
}

// 新 2K PNG 源图归档为 2048 宽 JPEG（源图不入库目录按 manifest 登记），返回归档路径
async function archiveSource(rawPng, archiveJpg) {
  const target = path.join(srcDir, archiveJpg)
  if (!existsSync(target)) {
    const jpeg = await sharp(rawPng).resize({ width: 2048, withoutEnlargement: true }).jpeg({ quality: 78, mozjpeg: true }).toBuffer()
    await writeFile(target, jpeg)
  }
  await rm(rawPng, { force: true })
  return target
}

const tinifyKeys = await loadTinifyKeys()
if (tinifyKeys.length === 0) process.stdout.write('提示：.env 无 TINIFY key，跳过 TinyPNG（仅 PNG8）\n')

const raw = path.join(srcDir, `pet-card-entry-${OUT_VERSION}-raw.png`)
// 出件版本与源图版本解耦：同一张源图可反复重出（锐化参数/尺寸调整不用重新生图）
const src = existsSync(raw)
  ? await archiveSource(raw, `pet-card-entry-source-${OUT_VERSION}.jpg`)
  : path.join(srcDir, 'pet-card-entry-source-v2.jpg')
if (!existsSync(src)) {
  process.stdout.write('跳过：缺 pet-card-entry-v3-raw.png / pet-card-entry-source-v2.jpg 归档源图\n')
  process.exit(0)
}
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const W = info.width, H = info.height
const bg = floodBackground(data, W, H)
const solid = applySolid(data, W, H, bg)
const box = alphaBox(solid, W, H, 4)
let png = await sharp(solid, { raw: { width: W, height: H, channels: 4 } })
  .extract(box)
  .resize({ width: OUT_WIDTH, withoutEnlargement: true, kernel: 'lanczos3' })
  // 缩放平均会糊掉虚线框等细笔画，轻锐化把边缘对比拉回来
  .sharpen({ sigma: 0.6, m1: 0.6, m2: 1.6 })
  .png({ palette: true, compressionLevel: 9 })
  .toBuffer()
if (tinifyKeys.length > 0) {
  const shrunk = await tinify(png, tinifyKeys)
  if (shrunk) png = shrunk
}
const outFile = path.join(outDir, `pet-card-entry-${OUT_VERSION}.png`)
await writeFile(outFile, png)
const outW = Math.min(OUT_WIDTH, box.width)
const outH = Math.round((outW / box.width) * box.height)
process.stdout.write(`${path.relative(root, outFile)} ${png.length}B (box ${box.width}x${box.height} → ${outW}x${outH}，纵横比 ${(box.width / box.height).toFixed(3)})\n`)
