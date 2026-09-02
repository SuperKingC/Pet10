// 主体服装贴合度自动验收：按真实运行时图盒（206×330rpx，3 倍渲染）合成
// 「仅底图」与「底图+服装切件」，逐像素求差得到服装掩码，与犬身剪影比对几何断言。
// 断言：领口 y ∈ [415,465]、下摆 y ∈ [645,695]、胸幅服装宽 ≥ 88% 体宽、水平中轴 218±14、
//       头部（y<415）无服装像素。任一失败退出码 1。
// 运行：node miniapp/tools/verify-body-fit.mjs
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(import.meta.dirname, '../..')
const BOX_W = 206 * 3
const BOX_H = 330 * 3
const CANVAS_W = 436
const CANVAS_H = 700
const BG = { r: 245, g: 234, b: 216 }

// 与 cut-worn-garments.mjs 的 TARGETS 同源（画布空间）
const TARGETS = {
  hoodie: { top: 388, bottom: 638, width: 400 },
  overalls: { top: 400, bottom: 672, width: 340 },
  dress: { top: 390, bottom: 662, width: 400 },
  raincoat: { top: 390, bottom: 672, width: 408 },
  pajamas: { top: 392, bottom: 652, width: 395 }
}

async function renderBase() {
  return sharp(path.join(root, 'miniapp/src/assets/xiaoduoli.png')).resize(BOX_W, BOX_H).png().toBuffer()
}

async function renderWithLayer(baseBuf, suit) {
  const st = TARGETS[suit]
  const lw = Math.round((st.width / CANVAS_W) * BOX_W)
  const layer = await sharp(path.join(root, `public/wardrobe/${suit}-layer-v3.png`)).resize({ width: lw }).png().toBuffer()
  const lm = await sharp(layer).metadata()
  return sharp(baseBuf)
    .composite([{ input: layer, left: Math.round((BOX_W - lm.width) / 2), top: Math.round((st.top / CANVAS_H) * BOX_H) }])
    .png().toBuffer()
}

function rowSpan(mask, y) {
  let min = -1
  let max = -1
  for (let x = 0; x < BOX_W; x++) {
    if (mask[y * BOX_W + x]) {
      if (min < 0) min = x
      max = x
    }
  }
  return min < 0 ? null : { min, max, width: max - min + 1 }
}

const baseBuf = await renderBase()
const baseRaw = await sharp(baseBuf).raw().toBuffer()
const baseMeta = { w: BOX_W, h: BOX_H }
const bodyMask = new Uint8Array(BOX_W * BOX_H)
for (let i = 0; i < BOX_W * BOX_H; i++) {
  const d = Math.max(Math.abs(baseRaw[i * 4] - BG.r), Math.abs(baseRaw[i * 4 + 1] - BG.g), Math.abs(baseRaw[i * 4 + 2] - BG.b))
  if (baseRaw[i * 4 + 3] > 100 && d > 25) bodyMask[i] = 1
}

let failed = 0
for (const suit of Object.keys(TARGETS)) {
  const withLayer = await renderWithLayer(baseBuf, suit)
  const raw = await sharp(withLayer).raw().toBuffer()
  const mask = new Uint8Array(BOX_W * BOX_H)
  let top = -1
  let bottom = -1
  for (let y = 0; y < BOX_H; y++) {
    for (let x = 0; x < BOX_W; x++) {
      const i = y * BOX_W + x
      const d = Math.max(Math.abs(raw[i * 4] - baseRaw[i * 4]), Math.abs(raw[i * 4 + 1] - baseRaw[i * 4 + 1]), Math.abs(raw[i * 4 + 2] - baseRaw[i * 4 + 2]))
      if (d > 30) {
        mask[i] = 1
        if (top < 0) top = y
        bottom = y
      }
    }
  }
  const toCanvasY = (y) => Math.round((y / BOX_H) * CANVAS_H)
  // 服装最大行宽（裙摆/袖最宽处）对比上胸围（领口下 25px 处）体宽
  let garmentMax = 0
  for (let y = 0; y < BOX_H; y++) {
    const span = rowSpan(mask, y)
    if (span && span.width > garmentMax) garmentMax = span.width
  }
  const chestRow = Math.round(((TARGETS[suit].top + 25) / CANVAS_H) * BOX_H)
  const garmentRow = rowSpan(mask, chestRow)
  const bodyRow = rowSpan(bodyMask, chestRow)
  const centerX = garmentRow ? (garmentRow.min + garmentRow.max) / 2 : -1
  const checks = []
  const push = (name, ok, detail) => { checks.push({ name, ok, detail }); if (!ok) failed++ }
  push('领口区间 378-405', top >= 0 && toCanvasY(top) >= 378 && toCanvasY(top) <= 405, `top=${top >= 0 ? toCanvasY(top) : 'none'}`)
  push('下摆区间 630-685', bottom >= 0 && toCanvasY(bottom) >= 630 && toCanvasY(bottom) <= 685, `bottom=${bottom >= 0 ? toCanvasY(bottom) : 'none'}`)
  const ratio = bodyRow ? garmentMax / bodyRow.width : 0
  push('服装宽 ≥85% 上胸围体宽', ratio >= 0.85, `ratio=${(ratio * 100).toFixed(1)}% garment=${garmentMax}px body=${bodyRow?.width ?? 0}px`)
  push('中轴 218±14', Math.abs(centerX / BOX_W * CANVAS_W - 218) <= 14, `center=${(centerX / BOX_W * CANVAS_W).toFixed(0)}`)
  const headLeak = top >= 0 && toCanvasY(top) < 375
  push('头部净空（375 以上无服装）', !headLeak, `topCanvas=${top >= 0 ? toCanvasY(top) : 'none'}`)
  const allOk = checks.every((c) => c.ok)
  console.log(`${allOk ? 'PASS' : 'FAIL'} ${suit}`)
  for (const c of checks) console.log(`   ${c.ok ? '✓' : '✗'} ${c.name}: ${c.detail}`)
  void baseMeta
}
if (failed > 0) {
  console.error(`\n${failed} 项断言未过`)
  process.exit(1)
}
console.log('\n全部通过')
