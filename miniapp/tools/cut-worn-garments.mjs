// 「穿着视角」服装件去底 + 原装立绘定位标定。
// 输入：design-assets/wardrobe/gen-{suit}-wear-v1.png（gen-worn-garments.mjs 生成的纯白底服装图）
// 输出：public/wardrobe/{suit}-layer-v3.png（紧裁 PNG8，COS 按需下载，不占包体）
//      + BODY_LAYER_STYLE 字面量（贴进 wardrobeModel.ts，436×700 原装画布百分比）
//      + tmp-body-layer-preview.png 蒙特奇（上行=仅服装件；下行=服装件+三配饰）供目检。
// 标定：每件给目标显示宽 + 领口顶 y（700 空间），水平以犬身中轴 x=218 居中；
//       改素材或想挪位置只调 TARGETS 重跑，不动代码其他部分。
// 运行：node miniapp/tools/cut-worn-garments.mjs
import { writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(import.meta.dirname, '../..')
const BASE_W = 436
const BASE_H = 700
const BODY_CX = 218

// 每件服装在原装画布上的目标几何：top=领口/肩线 y(px)，bottom=下摆 y(px)，width=目标显示宽(px)。
// 领口卡在颊毛下缘（≈430）之下、下摆停在爪垫上方；体宽（胸部最宽处）约 342px，
// 目标宽取体宽 88-96%（袖子摊到接近身体轮廓），水平以犬身中轴 x=218 居中，拉伸 ≤20%。
const TARGETS = {
  hoodie: { top: 388, bottom: 638, width: 400 },
  overalls: { top: 400, bottom: 672, width: 340 },
  dress: { top: 390, bottom: 662, width: 400 },
  raincoat: { top: 390, bottom: 672, width: 408 },
  pajamas: { top: 392, bottom: 652, width: 395 }
}

// 配饰在原装立绘上的几何（与 wardrobeModel.OUTFIT_LAYER_STYLE 同源，px on 436×700）。
// 帽檐须停在眼眶（y≈200）上方，围巾上沿卡在下巴（y≈382）之下不盖嘴。
const ACCESSORIES = {
  hat: { file: 'miniapp/src/assets/wardrobe/outfit-hat-v3.png', x: 109, y: 22, w: 218 },
  scarf: { file: 'miniapp/src/assets/wardrobe/outfit-scarf-cut-v2.png', x: 92, y: 405, w: 252 },
  bag: { file: 'miniapp/src/assets/wardrobe/outfit-bag-v3.png', x: 92, y: 518, w: 120 }
}

const pct = (v) => `${(Math.round(v * 1000000) / 10000).toFixed(2)}%`

// 白底去底：边界泛洪（含近白），内部白色（被描边包围）保留
function cutWhiteBg(data, W, H, keepRatio) {
  const at = (x, y) => {
    const o = (y * W + x) * 4
    return [data[o], data[o + 1], data[o + 2], data[o + 3]]
  }
  const isBgPixel = (x, y) => {
    const [r, g, b, a] = at(x, y)
    return a < 20 || (r >= 244 && g >= 242 && b >= 238)
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
    if (compId[i] >= 0 && comps[compId[i]] >= maxSize * keepRatio) keepMask[i] = 1
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
      out[o] = data[so]; out[o + 1] = data[so + 1]; out[o + 2] = data[so + 2]
      const edge = !masked(gx - 1, gy) || !masked(gx + 1, gy) || !masked(gx, gy - 1) || !masked(gx, gy + 1)
      out[o + 3] = edge ? 170 : 255
    }
  }
  return { data: out, width: bw, height: bh }
}

async function loadBaseRaw() {
  const { data, info } = await sharp(path.join(root, 'miniapp/src/assets/xiaoduoli.png'))
    .ensureAlpha().resize(BASE_W, BASE_H).raw().toBuffer({ resolveWithObject: true })
  if (info.width !== BASE_W || info.height !== BASE_H) throw new Error('base size changed')
  return data
}

const baseRaw = await loadBaseRaw()
const suits = ['hoodie', 'overalls', 'dress', 'raincoat', 'pajamas']
const report = []
const placed = {}

for (const suit of suits) {
  const srcPath = path.join(root, `design-assets/wardrobe/gen-${suit}-wear-v1.png`)
  if (!existsSync(srcPath)) {
    console.warn(`跳过 ${suit}：源图未生成（先跑 gen-worn-garments.mjs）`)
    continue
  }
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const cut = cutWhiteBg(data, info.width, info.height, 0.25)
  console.log('  [raw cut] ' + cut.width + 'x' + cut.height + ' aspect=' + (cut.width / cut.height).toFixed(2))
  const target = TARGETS[suit]
  const scaledH = target.bottom - target.top
  const scaledW = target.width
  const scaled = await sharp(cut.data, { raw: { width: cut.width, height: cut.height, channels: 4 } })
    .resize(scaledW, scaledH, { fit: 'fill' }).png().toBuffer()
  const sm = await sharp(scaled).metadata()
  const left = Math.round(BODY_CX - sm.width / 2)
  const top = target.top
  // 放到 436×700 画布上再紧裁出件
  const canvas = await sharp({ create: { width: BASE_W, height: BASE_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: scaled, left: Math.max(0, left), top }]).raw().toBuffer()
  let minX = BASE_W, minY = BASE_H, maxX = -1, maxY = -1
  for (let y = 0; y < BASE_H; y++) for (let x = 0; x < BASE_W; x++) {
    if (canvas[(y * BASE_W + x) * 4 + 3] < 8) continue
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
  }
  const bw = maxX - minX + 1, bh = maxY - minY + 1
  const outBuf = await sharp(canvas, { raw: { width: BASE_W, height: BASE_H, channels: 4 } })
    .extract({ left: minX, top: minY, width: bw, height: bh })
    .png({ palette: true, colors: 256, compressionLevel: 9 })
    .toBuffer()
  const style = { left: pct(minX / BASE_W), top: pct(minY / BASE_H), width: pct(bw / BASE_W) }
  placed[suit] = { buf: outBuf, bbox: { x: minX, y: minY, w: bw, h: bh } }
  await writeFile(path.join(root, `public/wardrobe/${suit}-layer-v3.png`), outBuf)
  report.push({ key: suit, file: `public/wardrobe/${suit}-layer-v3.png`, src: `design-assets/wardrobe/gen-${suit}-wear-v1.png`, bbox: { x: minX, y: minY, w: bw, h: bh }, bytes: outBuf.byteLength, style })
  console.log(`${suit}-layer-v3.png ${bw}x${bh} @(${minX},${minY}) ${(outBuf.byteLength / 1024).toFixed(1)}KB`, style)
}

console.log('\n// 主体服装切件叠加定位（436×700 原装画布百分比），由 miniapp/tools/cut-worn-garments.mjs 标定生成')
console.log('export const BODY_LAYER_STYLE: Partial<Record<SuitKey, { left: string; top: string; width: string }>> = ' +
  JSON.stringify(Object.fromEntries(suits.map((k) => [k, placed[k] ? report.find((r) => r.key === k).style : {}])), null, 2))
await writeFile(path.join(import.meta.dirname, 'body-layers.report.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), canvas: [BASE_W, BASE_H], bodyCenterX: BODY_CX, layers: report }, null, 2)}\n`)

// —— 蒙特奇目检：上行=原装+服装件；下行=再叠三配饰（1.6×） ——
const SCALE = 1.6
const accBufs = {}
for (const [acc, geo] of Object.entries(ACCESSORIES)) {
  accBufs[acc] = await sharp(path.join(root, geo.file)).ensureAlpha().png().toBuffer()
}
const baseBuf = await sharp(baseRaw, { raw: { width: BASE_W, height: BASE_H, channels: 4 } })
  .resize(Math.round(BASE_W * SCALE), Math.round(BASE_H * SCALE)).png().toBuffer()
const tilesTop = []
const tilesBottom = []
let x = 0
for (const suit of suits) {
  const p = placed[suit]
  if (!p) continue
  const layerBuf = await sharp(p.buf).resize(Math.round(p.bbox.w * SCALE), Math.round(p.bbox.h * SCALE)).png().toBuffer()
  const comp = async (withAcc) => {
    const comps = [
      { input: baseBuf, left: 0, top: 0 },
      { input: layerBuf, left: Math.round(p.bbox.x * SCALE), top: Math.round(p.bbox.y * SCALE) }
    ]
    if (withAcc) {
      for (const [acc, geo] of Object.entries(ACCESSORIES)) {
        const w = Math.round(geo.w * SCALE)
        comps.push({
          input: await sharp(accBufs[acc]).resize({ width: w }).png().toBuffer(),
          left: Math.round(geo.x * SCALE),
          top: Math.round(geo.y * SCALE)
        })
      }
    }
    return sharp({ create: { width: Math.round(BASE_W * SCALE), height: Math.round(BASE_H * SCALE), channels: 4, background: '#f5ead8' } })
      .composite(comps).png().toBuffer()
  }
  tilesTop.push({ input: await comp(false), left: x, top: 0 })
  tilesBottom.push({ input: await comp(true), left: x, top: Math.round(BASE_H * SCALE) + 10 })
  x += Math.round(BASE_W * SCALE) + 10
}
await sharp({ create: { width: x, height: Math.round(BASE_H * SCALE) * 2 + 10, channels: 4, background: '#efe2cc' } })
  .composite([...tilesTop, ...tilesBottom]).png().toFile(path.join(import.meta.dirname, 'tmp-body-layer-preview.png'))
console.log('\npreview -> miniapp/tools/tmp-body-layer-preview.png')
