// AI 生成服饰切件：白底去底 → 连通成分（保留 ≥12% 主成分的部件，睡衣两件套场景）→ 实心出件
// 运行：node miniapp/tools/cut-generated-garments.mjs
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const srcDir = path.resolve(import.meta.dirname, '../../design-assets/wardrobe')
const cosOutDir = path.resolve(import.meta.dirname, '../../public/wardrobe')
const bundledOutDir = path.resolve(import.meta.dirname, '../src/assets/wardrobe')

// key → { src, out(输出文件名), max(出件最长边), bundled, keepRatio }
const GARMENTS = [
  { key: 'hoodie', src: 'gen-hoodie-v1.png', out: 'hoodie-icon-v2.png', max: 176, bundled: false },
  { key: 'overalls', src: 'gen-overalls-v1.png', out: 'overalls-icon-v2.png', max: 176, bundled: false },
  { key: 'dress', src: 'gen-dress-v1.png', out: 'dress-icon-v2.png', max: 176, bundled: false },
  { key: 'raincoat', src: 'gen-raincoat-v1.png', out: 'raincoat-icon-v2.png', max: 176, bundled: false },
  { key: 'pajamas', src: 'gen-pajamas-v1.png', out: 'pajamas-icon-v2.png', max: 176, bundled: false, keepRatio: 0.12 },
  { key: 'hat', src: 'gen-hat-v1.png', out: 'outfit-hat-v3.png', max: 184, bundled: true },
  { key: 'bag', src: 'gen-bag-v1.png', out: 'outfit-bag-v3.png', max: 156, bundled: true, trimTopRatio: 0.52, dropWhiteAboveTeal: true }
]

function cutWhiteBg(data, W, H, keepRatio = 1, trimTopRatio = 0, dropWhiteAboveTeal = false) {
  const at = (x, y) => {
    const o = (y * W + x) * 4
    return [data[o], data[o + 1], data[o + 2], data[o + 3]]
  }
  const isBgPixel = (x, y) => {
    const [r, g, b, a] = at(x, y)
    return a < 20 || (r >= 246 && g >= 244 && b >= 242)
  }
  const bg = new Uint8Array(W * H)
  const q = []
  for (let x = 0; x < W; x++) { for (const y of [0, H - 1]) { const m = y * W + x; if (isBgPixel(x, y) && !bg[m]) { bg[m] = 1; q.push(m) } } }
  for (let y = 0; y < H; y++) { for (const x of [0, W - 1]) { const m = y * W + x; if (isBgPixel(x, y) && !bg[m]) { bg[m] = 1; q.push(m) } } }
  while (q.length) {
    const m = q.pop()
    const x = m % W, y = Math.floor(m / W)
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
      const nm = ny * W + nx
      if (!bg[nm] && isBgPixel(nx, ny)) { bg[nm] = 1; q.push(nm) }
    }
  }
  // 连通成分（非背景），按面积排序，保留 ≥ keepRatio×最大 的成分
  const compId = new Int32Array(W * H).fill(-1)
  const comps = []
  for (let start = 0; start < W * H; start++) {
    if (bg[start] || compId[start] >= 0) continue
    let size = 0
    const cq = [start]
    compId[start] = comps.length
    while (cq.length) {
      const m = cq.pop()
      size += 1
      const x = m % W, y = Math.floor(m / W)
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
        const nm = ny * W + nx
        if (!bg[nm] && compId[nm] < 0) { compId[nm] = comps.length; cq.push(nm) }
      }
    }
    comps.push(size)
  }
  if (comps.length === 0) throw new Error('整图皆背景')
  const maxSize = Math.max(...comps)
  const keepMask = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) {
    if (compId[i] >= 0 && comps[compId[i]] >= maxSize * keepRatio) keepMask[i] = 1
  }
  let minX = W, minY = H, maxX = -1, maxY = -1
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!keepMask[y * W + x]) continue
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
  }
  if (trimTopRatio) minY = minY + Math.round((maxY - minY) * trimTopRatio)
  if (dropWhiteAboveTeal) {
    const isTeal = (x, y) => {
      const o = (y * W + x) * 4
      const r = data[o], gg = data[o + 1], b = data[o + 2]
      return gg > r + 8 && gg > b - 60 && gg > 140 && b > 120
    }
    let tealTop = H
    for (let y = 0; y < H; y++) { for (let x = 0; x < W; x++) { if (keepMask[y * W + x] && isTeal(x, y)) { tealTop = Math.min(tealTop, y); break } } }
    for (let y = 0; y < Math.min(tealTop, H); y++) {
      for (let x = 0; x < W; x++) {
        const m = y * W + x
        if (!keepMask[m]) continue
        const o = m * 4
        const r = data[o], gg = data[o + 1], b = data[o + 2]
        if (r > 200 && gg > 195 && b > 170) keepMask[m] = 0 // 白/奶油（背带）
      }
    }
  }
  const bw = maxX - minX + 1, bh = maxY - minY + 1
  const out = Buffer.alloc(bw * bh * 4)
  const masked = (mx, my) => (mx >= 0 && my >= 0 && mx < W && my < H) ? keepMask[my * W + mx] === 1 : 0
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const gx = minX + x, gy = minY + y
      const m = gy * W + gx
      const o = (y * bw + x) * 4
      if (!keepMask[m]) continue
      const so = m * 4
      const edge = (!masked(gx - 1, gy) || !masked(gx + 1, gy) || !masked(gx, gy - 1) || !masked(gx, gy + 1))
      out[o] = data[so]; out[o + 1] = data[so + 1]; out[o + 2] = data[so + 2]
      out[o + 3] = edge ? 170 : 255
    }
  }
  return { data: out, width: bw, height: bh }
}

await mkdir(cosOutDir, { recursive: true })
await mkdir(bundledOutDir, { recursive: true })
const report = []
for (const g of GARMENTS) {
  const srcPath = path.join(srcDir, g.src)
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const cut = cutWhiteBg(data, info.width, info.height, g.keepRatio ?? 1, g.trimTopRatio, g.dropWhiteAboveTeal)
  const png = await sharp(cut.data, { raw: { width: cut.width, height: cut.height, channels: 4 } })
    .resize(g.max, g.max, { fit: 'inside', kernel: 'lanczos3' })
    .png({ palette: true, colors: 160, compressionLevel: 9 })
    .toBuffer()
  await writeFile(path.join(cosOutDir, g.out), png)
  if (g.bundled) {
    await writeFile(path.join(bundledOutDir, g.out), png)
  }
  report.push({ key: g.key, file: `public/wardrobe/${g.out}`, width: cut.width, height: cut.height, bytes: png.byteLength, bundled: g.bundled })
  console.log(`${g.out}: ${(png.byteLength / 1024).toFixed(1)}KB ${cut.width}x${cut.height}${g.bundled ? ' (bundled)' : ' (COS)'}`)
}
await writeFile(path.resolve(import.meta.dirname, 'gen-garments.report.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), garments: report }, null, 2)}\n`)
console.log('done')
