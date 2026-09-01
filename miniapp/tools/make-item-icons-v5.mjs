// 道具图标 v5 出件：design-assets/nest 的白底 AI 源图 → 去底 → 方形紧裁 → 80px PNG8 → TinyPNG，
// 写入 miniapp/src/assets/items/item-{id}-v5.png，源图转 2048 宽 JPEG 归档（删除原 PNG 以免 check-assets 缺登记）。
// 去底策略沿用 make-photo-wall-decor.mjs 的 solid 模式：四边洪水填充近白背景 +
// 封闭近白保护（奶白骨身/球面条纹等内部浅色保持不透明）+ 贴边软 alpha 反解。
// 运行：node miniapp/tools/make-item-icons-v5.mjs
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(import.meta.dirname, '../..')
const srcDir = path.join(root, 'design-assets/nest')
const outDir = path.join(root, 'miniapp/src/assets/items')
const ITEMS = ['dog_food', 'ball', 'soap', 'bone']
// 72px = 任务面板口袋槽 72rpx 的 2x（照顾栏芯片 32px 只有 2.25x 富余）；80px 一轮实测超出主包红线
const SIZE = 72
const PAD = 8

const isNearWhite = (r, g, b) => r >= 246 && g >= 244 && b >= 242

// 从四边洪水填充近白背景；返回掩码（1=外部背景区）
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

// 白底反解：观察色 C = 前景 α 叠加在白底上 → 反解前景色与 α
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

// 距离场膨胀：把 bg 掩码向外扩 n 圈
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

// solid 模式：背景与贴边抗锯齿走软 alpha，封闭近白与实体保持不透明
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

// 内容 bbox（alpha>8），外扩 PAD 后取正方形（短边方向居中扩展）
function squareBox(data, W, H) {
  let minX = W, minY = H, maxX = -1, maxY = -1
  for (let m = 0; m < W * H; m++) {
    if (data[m * 4 + 3] <= 8) continue
    const x = m % W, y = Math.floor(m / W)
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
  }
  if (maxX < 0) throw new Error('empty alpha')
  let x0 = Math.max(0, minX - PAD), y0 = Math.max(0, minY - PAD)
  let x1 = Math.min(W, maxX + 1 + PAD), y1 = Math.min(H, maxY + 1 + PAD)
  const side = Math.max(x1 - x0, y1 - y0)
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
  x0 = Math.max(0, Math.min(W - side, Math.round(cx - side / 2)))
  y0 = Math.max(0, Math.min(H - side, Math.round(cy - side / 2)))
  return { left: x0, top: y0, width: Math.min(side, W - x0), height: Math.min(side, H - y0) }
}

// TinyPNG：key 从仓库根 .env 读取（TINIFY_API_KEY 为主，_2.._5 备用），节省 ≥2% 才采用
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

const tinifyKeys = await loadTinifyKeys()
if (tinifyKeys.length === 0) process.stdout.write('提示：.env 无 TINIFY key，跳过 TinyPNG（仅 PNG8）\n')

for (const name of ITEMS) {
  // 源图文件名用连字符（item-dog-food-v5-source.jpg），出件用道具 id 下划线（item-dog_food-v5.png）
  // 2K PNG 源图首次运行时已转 2048 宽 JPEG 归档，重跑（调 SIZE 等）直接读 JPEG
  const srcFile = path.join(srcDir, `item-${name.replace(/_/g, '-')}-v5-source.jpg`)
  const { data, info } = await sharp(srcFile).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height
  const bg = floodBackground(data, W, H)
  const solid = applySolid(data, W, H, bg)
  const box = squareBox(solid, W, H)
  let png = await sharp(solid, { raw: { width: W, height: H, channels: 4 } })
    .extract(box)
    .resize(SIZE, SIZE, { kernel: 'lanczos3' })
    .png({ palette: true, compressionLevel: 9 })
    .toBuffer()
  if (tinifyKeys.length > 0) {
    const shrunk = await tinify(png, tinifyKeys)
    if (shrunk) png = shrunk
  }
  const outFile = path.join(outDir, `item-${name}-v5.png`)
  await writeFile(outFile, png)
  process.stdout.write(`${path.relative(root, outFile)} ${png.length}B (source ${path.basename(srcFile)}, box ${box.width}x${box.height})\n`)
}
