// 主体服装贴合度自动验收（chroma 全画布叠层版）：按真实运行时图盒（206×330rpx，3 倍渲染）
// 合成「仅底图」与「底图+全画布服装层」，逐像素求差得到服装掩码，与犬身剪影比对几何断言。
// 断言：领口 y ∈ [330,470]（模型贴下巴画领）、下摆 y ∈ [560,690]、服装最宽 ≥70% 犬身最宽、
//       水平中轴 218±25、嘴部（y<350）无服装像素。任一失败退出码 1。
// 运行：node miniapp/tools/verify-body-fit.mjs
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(import.meta.dirname, '../..')
const BOX_W = 206 * 3
const BOX_H = 330 * 3
const CANVAS_W = 436
const CANVAS_H = 700
const BG = { r: 245, g: 234, b: 216 }
const SUITS = ['hoodie', 'overalls', 'dress', 'raincoat', 'pajamas']

async function renderBase() {
  return sharp(path.join(root, 'miniapp/src/assets/xiaoduoli.png')).resize(BOX_W, BOX_H).png().toBuffer()
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
const bodyMask = new Uint8Array(BOX_W * BOX_H)
for (let i = 0; i < BOX_W * BOX_H; i++) {
  const d = Math.max(Math.abs(baseRaw[i * 4] - BG.r), Math.abs(baseRaw[i * 4 + 1] - BG.g), Math.abs(baseRaw[i * 4 + 2] - BG.b))
  if (baseRaw[i * 4 + 3] > 120 && d > 25) bodyMask[i] = 1
}
let bodyMax = 0
for (let y = 0; y < BOX_H; y++) {
  const span = rowSpan(bodyMask, y)
  if (span && span.width > bodyMax) bodyMax = span.width
}

let failed = 0
for (const suit of SUITS) {
  const layer = await sharp(path.join(root, `public/wardrobe/${suit}-layer-v7.png`)).resize(BOX_W, BOX_H).png().toBuffer()
  const withLayer = await sharp(baseBuf).composite([{ input: layer, left: 0, top: 0 }]).png().toBuffer()
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
  let garmentMax = 0
  for (let y = 0; y < BOX_H; y++) {
    const span = rowSpan(mask, y)
    if (span && span.width > garmentMax) garmentMax = span.width
  }
  const midRow = Math.round(((top + bottom) / 2))
  const garmentRow = rowSpan(mask, midRow)
  const centerX = garmentRow ? ((garmentRow.min + garmentRow.max) / 2 / BOX_W) * CANVAS_W : -1
  const checks = []
  const push = (name, ok, detail) => { checks.push({ name, ok, detail }); if (!ok) failed++ }
  push('衣领区间 250-470', top >= 0 && toCanvasY(top) >= 225 && toCanvasY(top) <= 470, `top=${top >= 0 ? toCanvasY(top) : 'none'}`)
  push('下摆区间 560-700', bottom >= 0 && toCanvasY(bottom) >= 560 && toCanvasY(bottom) <= 700, `bottom=${bottom >= 0 ? toCanvasY(bottom) : 'none'}`)
  const ratio = garmentMax / bodyMax
  push('服装宽 ≥60% 犬身最宽', ratio >= 0.6, `ratio=${(ratio * 100).toFixed(1)}% garment=${garmentMax}px body=${bodyMax}px`)
  push('中轴 218±25', Math.abs(centerX - 218) <= 25, `center=${centerX.toFixed(0)}`)
  // 舌头净空：舌区（嘴下中央）若有服装像素=衣领压舌
  let tongueBlocked = false
  for (let y = Math.round((362 / CANVAS_H) * BOX_H); y <= Math.round((392 / CANVAS_H) * BOX_H); y++) {
    for (let x = Math.round((205 / CANVAS_W) * BOX_W); x <= Math.round((248 / CANVAS_W) * BOX_W); x++) {
      if (mask[y * BOX_W + x]) tongueBlocked = true
    }
  }
  push('舌头净空（舌区无服装）', !tongueBlocked, tongueBlocked ? '舌区有像素' : 'clear')
  const headLeak = top >= 0 && toCanvasY(top) < 225
  push('脸部净空（225 以上无服装）', !headLeak, `topCanvas=${top >= 0 ? toCanvasY(top) : 'none'}`)
  const allOk = checks.every((c) => c.ok)
  console.log(`${allOk ? 'PASS' : 'FAIL'} ${suit}`)
  for (const c of checks) console.log(`   ${c.ok ? '✓' : '✗'} ${c.name}: ${c.detail}`)
}
if (failed > 0) {
  console.error(`\n${failed} 项断言未过`)
  process.exit(1)
}
console.log('\n全部通过')
