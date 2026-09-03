// 小多利趴下姿切件：白底去底（边界泛洪+最大连通成分）→ alpha bbox 裁切 →
// 显示高 130px 的 2x 重采样 → PNG8（256 全色板+抖动）出件到 public/wardrobe（COS 按需下载，不占主包）。
// 趴姿闭眼单帧（无需眼层）；显示高取站姿 240px 的 54%（趴下压扁的合理读感）。
// 运行：node miniapp/tools/cut-xiaoduoli-lying-pose.mjs
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const srcPath = path.resolve(import.meta.dirname, '../../design-assets/nest/xiaoduoli-lying-source-v1.png')
const outPath = path.resolve(import.meta.dirname, '../../public/wardrobe/xiaoduoli-lying-v1.png')
// 趴姿显示高 130px（站姿 240 的 54%），出件 2x
const FRAME_HEIGHT_PX = 260

function cutWhiteBg(data, W, H) {
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
    if (compId[i] >= 0 && comps[compId[i]] === maxSize) keepMask[i] = 1
  }
  let minX = W, minY = H, maxX = -1, maxY = -1
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!keepMask[y * W + x]) continue
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
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

const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const cut = cutWhiteBg(data, info.width, info.height)
console.log(`[cut] bbox ${cut.width}x${cut.height}`)
const resized = await sharp(cut.data, { raw: { width: cut.width, height: cut.height, channels: 4 } })
  .resize({ height: FRAME_HEIGHT_PX, kernel: 'lanczos3' })
  .png()
  .toBuffer()
const meta = await sharp(resized).metadata()
const out = await sharp(resized)
  .png({ palette: true, colors: 256, dither: 1, compressionLevel: 9 })
  .toBuffer()
await writeFile(outPath, out)
console.log(`[out] ${outPath} ${meta.width}x${meta.height} ${(out.length / 1024).toFixed(1)}KB`)
