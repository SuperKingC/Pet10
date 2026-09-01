// 小多利动作素材切件：走路两帧（腾空/触地）+ 叼娃娃道具。白底去底（边界泛洪+最大连通成分）→
// 两帧统一画布且脚底基线对齐（叠放交替播放不抖）→ 按显示尺寸 2x 重采样 → PNG8（256 全色板+抖动）
// 出件到 public/wardrobe（COS 按需下载，不占主包）。
// 运行：node miniapp/tools/make-xiaoduoli-act-assets.mjs
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const srcDir = path.resolve(import.meta.dirname, '../../design-assets/nest')
const outDir = path.resolve(import.meta.dirname, '../../public/wardrobe')
// 走路帧显示高 150px（2x=300），娃娃显示 64px（2x=128）
const FRAME_HEIGHT_PX = 300
const DOLL_SIZE_PX = 128

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

async function cutSource(fileName) {
  const { data, info } = await sharp(path.join(srcDir, fileName)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return cutWhiteBg(data, info.width, info.height)
}

function png8(raw, width, height) {
  return sharp(raw, { raw: { width, height, channels: 4 } })
    .png({ palette: true, colors: 256, dither: 1, compressionLevel: 9 })
    .toBuffer()
}

// 走路两帧：各自按高 300 等比缩放 → 取最大宽作统一画布 → 各自水平居中、底边贴基线
const strideCut = await cutSource('xiaoduoli-walk-stride-source-v1.png')
const passCut = await cutSource('xiaoduoli-walk-pass-source-v1.png')
const strideResized = await sharp(strideCut.data, { raw: { width: strideCut.width, height: strideCut.height, channels: 4 } })
  .resize({ height: FRAME_HEIGHT_PX, kernel: 'lanczos3' }).png().toBuffer()
const passResized = await sharp(passCut.data, { raw: { width: passCut.width, height: passCut.height, channels: 4 } })
  .resize({ height: FRAME_HEIGHT_PX, kernel: 'lanczos3' }).png().toBuffer()
const strideMeta = await sharp(strideResized).metadata()
const passMeta = await sharp(passResized).metadata()
const canvasW = Math.max(strideMeta.width, passMeta.width)
const frames = []
for (const [name, buf, meta] of [
  ['xiaoduoli-walk-a-v1.png', strideResized, strideMeta],
  ['xiaoduoli-walk-b-v1.png', passResized, passMeta],
]) {
  const left = Math.round((canvasW - meta.width) / 2)
  const top = FRAME_HEIGHT_PX - meta.height
  const composited = await sharp({
    create: { width: canvasW, height: FRAME_HEIGHT_PX, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite([{ input: buf, left, top }]).png().toBuffer()
  const raw = await sharp(composited).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const out = await png8(raw.data, canvasW, FRAME_HEIGHT_PX)
  await writeFile(path.join(outDir, name), out)
  frames.push({ file: name, bytes: out.byteLength, contentWidth: meta.width, left, top })
}

// 娃娃：等比缩到 128 内切画布
const dollCut = await cutSource('xiaoduoli-doll-source-v1.png')
const dollPng = await sharp(dollCut.data, { raw: { width: dollCut.width, height: dollCut.height, channels: 4 } })
  .resize(DOLL_SIZE_PX, DOLL_SIZE_PX, { fit: 'inside', kernel: 'lanczos3' })
  .png({ palette: true, colors: 256, dither: 1, compressionLevel: 9 })
  .toBuffer()
await writeFile(path.join(outDir, 'xiaoduoli-doll-v1.png'), dollPng)
const dollMeta = await sharp(dollPng).metadata()

const report = {
  generatedAt: new Date().toISOString(),
  frameCanvas: { width: canvasW, height: FRAME_HEIGHT_PX, displayWidth: canvasW / 2, displayHeight: FRAME_HEIGHT_PX / 2 },
  frames,
  doll: { file: 'xiaoduoli-doll-v1.png', bytes: dollPng.byteLength, width: dollMeta.width, height: dollMeta.height, displaySize: DOLL_SIZE_PX / 2 },
}
await writeFile(path.resolve(import.meta.dirname, 'xiaoduoli-act.report.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report))
