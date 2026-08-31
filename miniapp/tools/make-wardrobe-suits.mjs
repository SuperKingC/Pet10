// 衣柜素材 v4：网格服装特写 + 三件叠穿件（帽/巾/包）
// —— 围巾：改用用户提供的 2048² 高清参考图（design-assets/wardrobe/reference-sheet-v1.png）
//    按颜色连通分割精准切出（粉白格纹+雏菊，舌头按位置遮挡，深描边/体毛/暖背景为边界），清晰度远超旧 256 源。
// —— 帽子/小包：旧素材画布散件直切（干净）。后续可整体迁移到参考图出件。
// —— 主体服装（连帽衫/背带裤/小裙子/雨衣/睡衣）：旧源人衣融合，拆件会贴纸化（已实验验证），
//    网格特写用色板分割或矩形窗，预览/场景仍为整套穿装立绘。
// 叠穿件在 app 内按 wardrobeModel.ts 的定位元数据（与各 suit 的 cx/ty/w 标定一致）叠到原装立绘上。
// 落点：三件叠穿件随包（public 同步一份）；主体服装立绘+COS 按需下载。
// 运行：node miniapp/tools/make-wardrobe-suits.mjs
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const srcDir = path.resolve(import.meta.dirname, '../../design-assets/wardrobe')
const cosOutDir = path.resolve(import.meta.dirname, '../../public/wardrobe')
const bundledOutDir = path.resolve(import.meta.dirname, '../src/assets/wardrobe')
const BASE_W = 436
const BASE_H = 700
const SRC = 256

async function loadRaw(name) {
  const { data } = await sharp(path.join(srcDir, `${name}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return data
}

/**
 * 高清参考图切衣（reference-sheet-v1.png，2048²）：
 * 衣服专属色种子 → 非毛/非背景/非描边连通生长 → 舌头等待殊区域按位置遮挡 → 去斑软边。
 * 返回紧贴内容 bbox 的 RGBA 及其在参考图中的位置。
 */
function segmentReferenceSheet(raw, W, crop, seeds, blockBoxes, colorKeys) {
  const { x1, y1, x2, y2 } = crop
  const cw = x2 - x1, ch = y2 - y1
  const at = (x, y) => {
    const o = (y * W + x) * 4
    return [raw[o], raw[o + 1], raw[o + 2]]
  }
  const inBlock = (x, y) => blockBoxes.some((b) => x >= b.x1 && x < b.x2 && y >= b.y1 && y < b.y2)
  const passable = (x, y) => {
    if (inBlock(x, y)) return false
    const [r, g, b] = at(x, y)
    if (Math.max(r, g, b) < 165) return false // 深描边
    const rb = r - b
    if (rb >= 18 && rb <= 45 && (r - g) < 30) return false // 奶油毛/暖背景
    return colorKeys.some((key) => key(r, g, b))
  }
  const mask = new Uint8Array(cw * ch)
  const queue = []
  for (const [sx1, sy1, sx2, sy2] of seeds) {
    for (let y = sy1; y < sy2; y++) {
      for (let x = sx1; x < sx2; x++) {
        if (passable(x, y)) {
          const m = (y - y1) * cw + (x - x1)
          if (!mask[m]) { mask[m] = 1; queue.push([x, y]) }
        }
      }
    }
  }
  while (queue.length) {
    const [x, y] = queue.pop()
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy
      if (nx < x1 || ny < y1 || nx >= x2 || ny >= y2) continue
      const m = (ny - y1) * cw + (nx - x1)
      if (!mask[m] && passable(nx, ny)) { mask[m] = 1; queue.push([nx, ny]) }
    }
  }
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const m = y * cw + x
      if (!mask[m]) continue
      let n = 0
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue
        const nx2 = x + dx, ny2 = y + dy
        if (nx2 >= 0 && ny2 >= 0 && nx2 < cw && ny2 < ch && mask[ny2 * cw + nx2]) n += 1
      }
      if (n <= 2) mask[m] = 0
    }
  }
  let minX = cw, minY = ch, maxX = -1, maxY = -1
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      if (!mask[y * cw + x]) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  const bw = maxX - minX + 1, bh = maxY - minY + 1
  const out = Buffer.alloc(bw * bh * 4)
  const alphaAt = (mx, my) => (mx < minX || my < minY || mx > maxX || my > maxY) ? 0 : (mask[my * cw + mx] ? 255 : 0)
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const m = (y + minY) * cw + (x + minX)
      const o = (y * bw + x) * 4
      if (!mask[m]) continue
      const so = ((y1 + minY + y) * W + (x1 + minX + x)) * 4
      let sum = 0
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += alphaAt(x + minX + dx, y + minY + dy)
      out[o] = raw[so]; out[o + 1] = raw[so + 1]; out[o + 2] = raw[so + 2]
      out[o + 3] = Math.round(raw[so + 3] * (0.35 + 0.65 * (sum / 9 / 255)))
    }
  }
  return { data: out, width: bw, height: bh, sheetX: x1 + minX, sheetY: y1 + minY }
}

/**
 * 高清参考图多边形切衣：手工标定的衣服轮廓多边形内全保留实心出件（格纹/印花零破坏），
 * blockBoxes 让位与衣色相同的特殊区（如舌头）。返回紧贴 bbox 的 RGBA。
 */
function segmentPolygonSheet(raw, W, crop, polygon, blockBoxes) {
  const { x1, y1, x2, y2 } = crop
  const cw = x2 - x1, ch = y2 - y1
  const inPolygon = (px, py) => {
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i]
      const [xj, yj] = polygon[j]
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
    }
    return inside
  }
  const mask = new Uint8Array(cw * ch)
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const gx = x1 + x, gy = y1 + y
      if (!inPolygon(gx, gy)) continue
      if (blockBoxes.some((b) => gx >= b.x1 && gx < b.x2 && gy >= b.y1 && gy < b.y2)) continue
      const o = (gy * W + gx) * 4
      const r = raw[o], g = raw[o + 1], b = raw[o + 2], a = raw[o + 3]
      if (a <= 8) continue
      // 近黑灰的描边交叠处剔除，衣服自身深色描边保留
      if (Math.max(r, g, b) < 120 && Math.max(r, g, b) - Math.min(r, g, b) < 60) continue
      mask[y * cw + x] = 1
    }
  }
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const m = y * cw + x
      if (!mask[m]) continue
      let n = 0
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue
        const nx2 = x + dx, ny2 = y + dy
        if (nx2 >= 0 && ny2 >= 0 && nx2 < cw && ny2 < ch && mask[ny2 * cw + nx2]) n += 1
      }
      if (n <= 2) mask[m] = 0
    }
  }
  let minX = cw, minY = ch, maxX = -1, maxY = -1
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    if (!mask[y * cw + x]) continue
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
  }
  const bw = maxX - minX + 1, bh = maxY - minY + 1
  const out = Buffer.alloc(bw * bh * 4)
  const masked = (mx, my) => (mx >= 0 && my >= 0 && mx < cw && my < ch) ? mask[my * cw + mx] === 1 : 0
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const mx = minX + x, my = minY + y
      const m = my * cw + mx
      const o = (y * bw + x) * 4
      if (!mask[m]) continue
      const so = ((y1 + my) * W + (x1 + mx)) * 4
      const edge = (!masked(mx - 1, my) || !masked(mx + 1, my) || !masked(mx, my - 1) || !masked(mx, my + 1))
      out[o] = raw[so]; out[o + 1] = raw[so + 1]; out[o + 2] = raw[so + 2]
      out[o + 3] = edge ? 160 : 255
    }
  }
  return { data: out, width: bw, height: bh }
}

function isTanFur(r, g, b) {
  // 棕黄/奶油体毛（衣服色粉/绿/蓝/紫/白都不落在这些判据里）
  if (r > 195 && g > 145 && b > 85 && b < 205 && (r - b) > 15 && (r - b) < 60 && g > b) return true
  return false
}

/**
 * 连通填充切衣：seedBoxes 内的像素为种子，经 passable 像素 4 邻域生长。
 * mode 'block-tan'：除棕毛外全可通（依赖衣服描边与棕毛边界挡住泄漏，适合描边完整的三角巾）。
 * mode 'palette'：色板距离 + 非棕毛（适合衣服色与毛色分明的绿/蓝/粉）。
 */
function segmentFill(data, crop, seedBoxes, mode, palette = [], tolerance = 95) {
  const { x1, y1, x2, y2 } = crop
  const cw = x2 - x1, ch = y2 - y1
  const at = (x, y) => {
    const o = (y * SRC + x) * 4
    return [data[o], data[o + 1], data[o + 2], data[o + 3]]
  }
  const near = (r, g, b) => palette.some(([pr, pg, pb]) => (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2 < tolerance ** 2)
  const passable = (x, y) => {
    const [r, g, b, a] = at(x, y)
    if (a < 40) return false
    if (isTanFur(r, g, b)) return false
    if (mode === 'block-tan') return true
    return near(r, g, b)
  }
  const mask = new Uint8Array(cw * ch)
  const queue = []
  for (const [sx1, sy1, sx2, sy2] of seedBoxes) {
    for (let y = Math.max(sy1, y1); y < Math.min(sy2, y2); y++) {
      for (let x = Math.max(sx1, x1); x < Math.min(sx2, x2); x++) {
        if (passable(x, y)) {
          const m = (y - y1) * cw + (x - x1)
          if (!mask[m]) { mask[m] = 1; queue.push([x, y]) }
        }
      }
    }
  }
  while (queue.length) {
    const [x, y] = queue.pop()
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy
      if (nx < x1 || ny < y1 || nx >= x2 || ny >= y2) continue
      const m = (ny - y1) * cw + (nx - x1)
      if (!mask[m] && passable(nx, ny)) { mask[m] = 1; queue.push([nx, ny]) }
    }
  }
  // 去斑：3×3 邻域内有效像素过少的孤立点剔除
  const neighborCount = (mx, my) => {
    let n = 0
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue
      const nx2 = mx + dx, ny2 = my + dy
      if (nx2 >= 0 && ny2 >= 0 && nx2 < cw && ny2 < ch && mask[ny2 * cw + nx2]) n += 1
    }
    return n
  }
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const m = y * cw + x
      if (mask[m] && neighborCount(x, y) <= 2) mask[m] = 0
    }
  }
  const out = Buffer.alloc(cw * ch * 4)
  const alphaAt = (mx, my) => (mx < 0 || my < 0 || mx >= cw || my >= ch) ? 0 : (mask[my * cw + mx] ? 255 : 0)
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const m = y * cw + x
      const o = m * 4
      if (!mask[m]) continue
      const [r, g, b, a] = at(x1 + x, y1 + y)
      let sum = 0
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += alphaAt(x + dx, y + dy)
      out[o] = r; out[o + 1] = g; out[o + 2] = b
      out[o + 3] = Math.round(a * (0.4 + 0.6 * (sum / 9 / 255)))
    }
  }
  return { data: out, width: cw, height: ch }
}

/** 矩形裁切（256 画布坐标） */
async function rectCut(name, box, maxSize = 240, colors = 192) {
  const data = await loadRaw(name)
  const cw = box.x2 - box.x1, ch = box.y2 - box.y1
  const out = Buffer.alloc(cw * ch * 4)
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const so = ((box.y1 + y) * SRC + (box.x1 + x)) * 4
      const doff = (y * cw + x) * 4
      out[doff] = data[so]; out[doff + 1] = data[so + 1]; out[doff + 2] = data[so + 2]; out[doff + 3] = data[so + 3]
    }
  }
  return sharp(out, { raw: { width: cw, height: ch, channels: 4 } })
    .resize(maxSize, maxSize, { fit: 'inside', kernel: 'lanczos3' })
    .png({ palette: true, colors, compressionLevel: 9 })
    .toBuffer()
}

async function png8(rawBuffer, width, height, maxSize = 240, colors = 192) {
  return sharp(rawBuffer, { raw: { width, height, channels: 4 } })
    .resize(maxSize, maxSize, { fit: 'inside', kernel: 'lanczos3' })
    .png({ palette: true, colors, compressionLevel: 9 })
    .toBuffer()
}

// —— 服装标定 ——
// 高清参考图（2048²）上的围巾：粉白格纹三角巾 + 雏菊；舌头色与格纹粉同色，按位置遮挡
const isSheetPink = (r, g, b) => r > 195 && (r - g) > 28 && (r - b) > 38
const isSheetWhite = (r, g, b) => (Math.max(r, g, b) - Math.min(r, g, b)) < 28 && r > 222
const isSheetYellow = (r, g, b) => r > 225 && g > 205 && (g - b) > 45 && (r - b) > 55

const overlaySuits = {
  // 帽子：紫色贝雷帽散件，戴在头顶
  hat: { rect: { src: 'purple-beret', box: { x1: 98, y1: 202, x2: 156, y2: 243 } }, cx: 218, ty: 52, w: 186 },
  // 围巾：高清参考图精准切出（格纹+雏菊，舌头遮挡框按采样标定）
  scarf: {
    sheetPolygon: {
      crop: { x1: 60, y1: 990, x2: 255, y2: 1125 },
      polygon: [[78, 1012], [150, 1022], [228, 1012], [233, 1030], [210, 1073], [203, 1096], [152, 1100], [86, 1072]],
      blockBoxes: [{ x1: 140, y1: 1000, x2: 166, y2: 1032 }]
    },
    cx: 218, ty: 344, w: 252
  },
  // 小包：斜挎包散件，挂身体左侧腹位
  bag: { rect: { src: 'crossbody-bag', box: { x1: 100, y1: 189, x2: 154, y2: 243 } }, cx: 150, ty: 528, w: 108 }
}

const bodySuits = {
  // 连帽衫/背带裤/小裙子：颜色分割切衣（衣色板来自标定）
  hoodie: {
    fill: { src: 'hoodie', crop: { x1: 96, y1: 180, x2: 193, y2: 234 }, seedBoxes: [[125, 195, 165, 215]], mode: 'palette', palette: [[125, 168, 143], [240, 238, 228]] }
  },
  overalls: {
    fill: { src: 'overalls', crop: { x1: 99, y1: 186, x2: 157, y2: 240 }, seedBoxes: [[118, 200, 140, 225]], mode: 'palette', palette: [[130, 160, 195], [235, 240, 244], [205, 218, 232], [172, 193, 216]], tolerance: 130 }
  },
  dress: { rect: { src: 'dress', box: { x1: 86, y1: 186, x2: 169, y2: 230 } } },
  // 雨衣/睡衣：衣色与毛色不可分（黄≈深棕黄、浅紫白领≈奶油），退回矩形裁窗
  raincoat: { rect: { src: 'raincoat', box: { x1: 87, y1: 182, x2: 167, y2: 230 } } },
  pajamas: { rect: { src: 'pajamas', box: { x1: 92, y1: 178, x2: 163, y2: 228 } } }
}

await mkdir(cosOutDir, { recursive: true })
await mkdir(bundledOutDir, { recursive: true })
const report = { generatedAt: new Date().toISOString(), base: `${BASE_W}x${BASE_H}`, suits: [] }

// 三件叠穿件（随包）：按展示尺寸精确出图，style 标定与文件一一对应
for (const [key, def] of Object.entries(overlaySuits)) {
  let rawBuf, nativeW, nativeH, contentW, feather
  if (def.sheetPolygon) {
    const sheetRaw = await loadRaw('reference-sheet-v1')
    const sheetMeta = await sharp(path.join(srcDir, 'reference-sheet-v1.png')).metadata()
    const seg = segmentPolygonSheet(sheetRaw, sheetMeta.width, def.sheetPolygon.crop, def.sheetPolygon.polygon, def.sheetPolygon.blockBoxes)
    rawBuf = seg.data
    nativeW = seg.width
    nativeH = seg.height
    contentW = seg.width
    feather = 0
  } else if (def.sheet) {
    // 高清参考图切衣：bbox 即内容，无羽化留白
    const sheetRaw = await loadRaw('reference-sheet-v1')
    const sheetMeta = await sharp(path.join(srcDir, 'reference-sheet-v1.png')).metadata()
    const seg = segmentReferenceSheet(sheetRaw, sheetMeta.width, def.sheet.crop, def.sheet.seeds, def.sheet.blockBoxes, def.sheet.colorKeys)
    rawBuf = seg.data
    nativeW = seg.width
    nativeH = seg.height
    contentW = seg.width
    feather = 0
  } else if (def.fill) {
    const raw = await loadRaw(def.fill.src)
    const seg = segmentFill(raw, def.fill.crop, def.fill.seedBoxes, def.fill.mode, def.fill.palette ?? [], def.fill.tolerance ?? 95)
    rawBuf = seg.data
    nativeW = seg.width
    nativeH = seg.height
    contentW = def.fill.crop.x2 - def.fill.crop.x1
    feather = 8
  } else {
    const raw = await loadRaw(def.rect.src)
    const box = def.rect.box
    const cw = box.x2 - box.x1, ch = box.y2 - box.y1
    const out = Buffer.alloc(cw * ch * 4)
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const so = ((box.y1 + y) * SRC + (box.x1 + x)) * 4
        const doff = (y * cw + x) * 4
        out[doff] = raw[so]; out[doff + 1] = raw[so + 1]; out[doff + 2] = raw[so + 2]; out[doff + 3] = raw[so + 3]
      }
    }
    rawBuf = out
    nativeW = cw
    nativeH = ch
    contentW = cw
    feather = 0
  }
  const dispScale = def.w / contentW
  const fileW = Math.round(nativeW * dispScale)
  const fileH = Math.round(nativeH * dispScale)
  const png = await sharp(rawBuf, { raw: { width: nativeW, height: nativeH, channels: 4 } })
    .resize(fileW, fileH, { kernel: 'lanczos3' })
    .png({ palette: true, colors: 192, compressionLevel: 9 })
    .toBuffer()
  const file = `outfit-${key}-v1.png`
  await writeFile(path.join(cosOutDir, file), png)
  await copyFile(path.join(cosOutDir, file), path.join(bundledOutDir, file))
  const marginDisp = feather * dispScale
  const leftPct = ((def.cx - def.w / 2 - marginDisp) / BASE_W) * 100
  const topPct = ((def.ty - marginDisp) / BASE_H) * 100
  const widthPct = (fileW / BASE_W) * 100
  report.suits.push({
    key, kind: 'overlay',
    file: `public/wardrobe/${file}`,
    bundled: true,
    bytes: png.byteLength,
    width: fileW, height: fileH,
    style: { left: `${leftPct.toFixed(2)}%`, top: `${topPct.toFixed(2)}%`, width: `${widthPct.toFixed(2)}%` }
  })
  console.log(`${key}: ${(png.byteLength / 1024).toFixed(1)}KB ${fileW}x${fileH} style ${JSON.stringify(report.suits.at(-1).style)}`)
}

// 五件主体服装：特写图标（COS）+ 整套穿装立绘（COS）
for (const [key, def] of Object.entries(bodySuits)) {
  let icon
  if (def.fill) {
    const raw = await loadRaw(def.fill.src)
    const seg = segmentFill(raw, def.fill.crop, def.fill.seedBoxes, def.fill.mode, def.fill.palette ?? [], def.fill.tolerance ?? 95)
    icon = await png8(seg.data, seg.width, seg.height, 176, 128)
  } else {
    icon = await rectCut(def.rect.src, def.rect.box, 176, 128)
  }
  const iconFile = `${key}-icon-v1.png`
  await writeFile(path.join(cosOutDir, iconFile), icon)
  // 整套穿装立绘：从源 PNG 文件直接裁透明边（raw 缓冲不能走 trim）
  const render = await sharp(path.join(srcDir, `${key}.png`)).trim().png().toBuffer()
  const full = await sharp(render).resize({ height: 320, fit: 'inside' }).png({ palette: true, colors: 256, compressionLevel: 9 }).toBuffer()
  const fullFile = `${key}-v1.png`
  await writeFile(path.join(cosOutDir, fullFile), full)
  report.suits.push({ key, kind: 'full-render', icon: `public/wardrobe/${iconFile}`, full: `public/wardrobe/${fullFile}`, bundled: false, iconBytes: icon.byteLength, fullBytes: full.byteLength })
  console.log(`${key}: icon ${(icon.byteLength / 1024).toFixed(1)}KB, full ${(full.byteLength / 1024).toFixed(1)}KB (COS)`)
}

await writeFile(path.resolve(import.meta.dirname, 'wardrobe-suits.report.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log(`done: ${report.suits.length} suits`)
