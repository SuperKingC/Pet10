// 校准主体服装 × 配饰叠加位置（ wardrobeModel.ts 的 BODY_OVERLAY_STYLE 来源）。
// 依据：所有立绘为同一坐姿狗的紧裁图（bbox≈全图、头顶贴 y=0、左右居中），
// 配饰在默认立绘(436×700)上的位置按 s=320/700 整体缩放，横向按各图宽重归一。
// 输出：① BODY_OVERLAY_STYLE 字面量（贴进 wardrobeModel.ts）② 蒙特奇预览 tmp-body-overlay-preview.png 供目检。
// 运行：node miniapp/tools/calibrate-body-overlays.mjs
import { readFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(import.meta.dirname, '../..')
const DEFAULT_W = 436
const DEFAULT_H = 700
const S = 320 / DEFAULT_H

// 配饰在默认立绘上的几何（与 wardrobeModel.OUTFIT_LAYER_STYLE 同源，px）
const ACCESSORIES = {
  hat: { file: 'miniapp/src/assets/wardrobe/outfit-hat-v3.png', x: 109, y: 48, w: 218 },
  scarf: { file: 'miniapp/src/assets/wardrobe/outfit-scarf-cut-v2.png', x: 92, y: 344, w: 252 },
  bag: { file: 'miniapp/src/assets/wardrobe/outfit-bag-v3.png', x: 92, y: 518, w: 120 }
}

// 主体服装整套立绘（public/wardrobe，宽×高）
const SUITS = {
  hoodie: [245, 320],
  overalls: [210, 320],
  dress: [218, 320],
  raincoat: [189, 320],
  pajamas: [161, 320]
}

const pct = (v) => `${(Math.round(v * 100) / 100).toFixed(2)}%`
const style = {}

for (const [suit, [w, h]] of Object.entries(SUITS)) {
  style[suit] = {}
  const offsetX = w / 2 - (DEFAULT_W / 2) * S // 狗居中对齐：缩放默认画布中心 → 各图中心
  for (const [acc, geo] of Object.entries(ACCESSORIES)) {
    const left = geo.x * S + offsetX
    const top = geo.y * S
    const width = geo.w * S
    style[suit][acc] = { left: pct((left / w) * 100), top: pct((top / h) * 100), width: pct((width / w) * 100) }
  }
}

console.log('// 主体服装（非原装）× 配饰的叠加定位：由 miniapp/tools/calibrate-body-overlays.mjs 按同姿势紧裁立绘线性换算，改素材必须重跑')
console.log('export const BODY_OVERLAY_STYLE: Partial<Record<string, Partial<Record<SuitKey, { left: string; top: string; width: string }>>>> =')
console.log(JSON.stringify(style, null, 2))

// —— 蒙特奇：每套立绘按算得的位置叠上三件配饰（2 倍放大目检） ——
const SCALE = 2
const tiles = []
let x = 0
for (const [suit, [w, h]] of Object.entries(SUITS)) {
  const suitBuf = await sharp(path.join(root, `public/wardrobe/${suit}-v1.png`)).resize({ width: w * SCALE, height: h * SCALE }).png().toBuffer()
  const composites = [{ input: suitBuf, left: 0, top: 0 }]
  for (const [acc, geo] of Object.entries(ACCESSORIES)) {
    const st = style[suit][acc]
    const accBuf = await sharp(path.join(root, geo.file))
      .resize({ width: Math.round((parseFloat(st.width) / 100) * w * SCALE) })
      .png().toBuffer()
    composites.push({
      input: accBuf,
      left: Math.round((parseFloat(st.left) / 100) * w * SCALE),
      top: Math.round((parseFloat(st.top) / 100) * h * SCALE)
    })
  }
  const tile = await sharp({ create: { width: w * SCALE, height: h * SCALE, channels: 4, background: '#f5ead8' } })
    .composite(composites).png().toBuffer()
  tiles.push({ input: tile, left: x, top: 0 })
  x += w * SCALE + 12
}
await sharp({ create: { width: x, height: 320 * SCALE, channels: 4, background: '#f5ead8' } })
  .composite(tiles).png().toFile(path.join(import.meta.dirname, 'tmp-body-overlay-preview.png'))
console.log('preview -> miniapp/tools/tmp-body-overlay-preview.png')
