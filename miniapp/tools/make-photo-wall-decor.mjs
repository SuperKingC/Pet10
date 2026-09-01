// 照片墙装饰出件：从 design-assets/nest 的白底源图生成透明底装饰素材。
// 三种去底策略（共用边界洪水填充 + 封闭白保护）：
//   glow  —— 灯串：全域「白底反解」软 alpha，光晕渐变到 0，玻璃泡保留半透感
//   solid —— 图钉：深色实体保持不透明（min<190），仅高光/阴影/抗锯齿边走软 alpha
//   cut   —— 胶带：洪水填充区外全部不透明（奶油色胶带体不能被反解掉），填充区软边
// 出件：miniapp/src/assets/decor/*.png（PNG8 lanczos3 缩放），并把源图归档为 1600 宽 JPEG。
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'

const root = resolve(import.meta.dirname, '../..')
const srcDir = resolve(root, 'design-assets/nest')
const outDir = resolve(root, 'miniapp/src/assets/decor')

const SOURCES = [
  { file: 'photo-wall-lights-source-v1.jpg', mode: 'glow', cluster: 'x' },
  { file: 'photo-wall-pins-source-v1.jpg', mode: 'solid', cluster: 'x' },
  { file: 'photo-wall-tapes-source-v1.jpg', mode: 'cut', cluster: 'y' }
]

const isNearWhite = (r, g, b) => r >= 246 && g >= 244 && b >= 242

// 从四边洪水填充近白背景；返回 Uint8Array 标记（1=外部背景区）
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

// 距离场膨胀：把 bg 掩码向外扩 n 圈（1=抗锯齿边，4=阴影邻域）
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

function applyMode(data, W, H, mode, bg) {
  const out = Buffer.from(data)
  const edge1 = dilate(bg, W, H, 1)
  for (let m = 0; m < W * H; m++) {
    const o = m * 4
    const r = data[o], g = data[o + 1], b = data[o + 2]
    const minC = Math.min(r, g, b), maxC = Math.max(r, g, b)
    if (mode !== 'glow') {
      // cut/solid：贴边软化 + 封闭近白保护 + 浅灰阴影（距离无关）转半透明 + 其余实体
      if (bg[m]) { const [nr, ng, nb, na] = unmixOverWhite(data, o); out[o] = nr; out[o + 1] = ng; out[o + 2] = nb; out[o + 3] = na; continue }
      // 封闭近白（图钉高光、胶带白条纹）：保持不透明
      if (!edge1[m] && isNearWhite(r, g, b)) { out[o + 3] = 255; continue }
      // 低饱和浅灰 = 投影，按深浅反解成半透明
      if (maxC - minC < 14 && minC > 205) { const [nr, ng, nb, na] = unmixOverWhite(data, o); out[o] = nr; out[o + 1] = ng; out[o + 2] = nb; out[o + 3] = na; continue }
      // 贴边 1px 的高亮浅色 = 抗锯齿白边，反解软化
      if (edge1[m] && minC >= 200) { const [nr, ng, nb, na] = unmixOverWhite(data, o); out[o] = nr; out[o + 1] = ng; out[o + 2] = nb; out[o + 3] = na; continue }
      out[o + 3] = 255
      continue
    }
    // glow：封闭近白（玻璃泡高光）保持不透明，其余全域白底反解（光晕渐变到 0）
    if (!edge1[m] && isNearWhite(r, g, b)) { out[o + 3] = 255; continue }
    const [nr, ng, nb, na] = unmixOverWhite(data, o)
    out[o] = nr; out[o + 1] = ng; out[o + 2] = nb; out[o + 3] = na
  }
  return out
}

// 连通域（alpha>8），返回 { boxes: [{minX,minY,maxX,maxY,area}] }
function components(data, W, H) {
  const seen = new Uint8Array(W * H)
  const boxes = []
  for (let start = 0; start < W * H; start++) {
    if (seen[start] || data[start * 4 + 3] <= 8) continue
    let minX = W, minY = H, maxX = -1, maxY = -1, area = 0
    const q = [start]
    seen[start] = 1
    while (q.length) {
      const m = q.pop()
      area += 1
      const x = m % W, y = Math.floor(m / W)
      if (x < minX) minX = x; if (x > maxX) maxX = x
      if (y < minY) minY = y; if (y > maxY) maxY = y
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
        const nm = ny * W + nx
        if (!seen[nm] && data[nm * 4 + 3] > 8) { seen[nm] = 1; q.push(nm) }
      }
    }
    boxes.push({ minX, minY, maxX, maxY, area, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 })
  }
  return boxes
}

// 按行/列聚簇：排序后在前一个最大间隙处切开，保留期望段数
function clusterBoxes(boxes, axis, expect) {
  const sorted = [...boxes].sort((p, q) => p[axis] - q[axis])
  if (sorted.length <= expect) return sorted.map((b) => [b])
  const gaps = []
  for (let i = 1; i < sorted.length; i++) gaps.push({ at: i, size: sorted[i][axis] - sorted[i - 1][axis] })
  const cuts = gaps.sort((p, q) => q.size - p.size).slice(0, expect - 1).map((g) => g.at).sort((p, q) => p - q)
  const groups = []
  let current = []
  for (let i = 0; i < sorted.length; i++) {
    if (cuts.includes(i) && current.length) { groups.push(current); current = [] }
    current.push(sorted[i])
  }
  if (current.length) groups.push(current)
  return groups
}

async function processSource({ file, mode, cluster }) {
  const sourcePath = resolve(srcDir, file)
  const { data, info } = await sharp(sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height
  const bg = floodBackground(data, W, H)
  const out = applyMode(data, W, H, mode, bg)
  const boxes = components(out, W, H).filter((b) => b.area >= 400)
  if (boxes.length === 0) throw new Error(`${file}: 没有可用前景`)
  const groups = mode === 'glow'
    ? [boxes]
    : clusterBoxes(boxes, cluster === 'x' ? 'cx' : 'cy', 3)
  return { file, W, H, data, raw: out, groups }
}

function png8(raw, width, height, dither = 1) {
  return sharp(raw, { raw: { width, height, channels: 4 } })
    .png({ palette: true, colors: 256, dither, compressionLevel: 9 })
    .toBuffer()
}

async function cropAndSave(group, W, H, raw, name, resize, dither) {
  let minX = W, minY = H, maxX = -1, maxY = -1
  for (const b of group) {
    if (b.minX < minX) minX = b.minX; if (b.maxX > maxX) maxX = b.maxX
    if (b.minY < minY) minY = b.minY; if (b.maxY > maxY) maxY = b.maxY
  }
  const pad = 4
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad)
  maxX = Math.min(W - 1, maxX + pad); maxY = Math.min(H - 1, maxY + pad)
  const cw = maxX - minX + 1, ch = maxY - minY + 1
  const cropped = await sharp(raw, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: minX, top: minY, width: cw, height: ch })
    .png().toBuffer()
  const resized = await sharp(cropped).resize(resize).png().toBuffer()
  const meta = await sharp(resized).raw().toBuffer({ resolveWithObject: true })
  const out = await png8(meta.data, meta.info.width, meta.info.height, dither)
  await writeFile(resolve(outDir, name), out)
  return { name, width: meta.info.width, height: meta.info.height, bytes: out.byteLength }
}

const PIN_NAMES = ['photo-wall-pin-red-v1.png', 'photo-wall-pin-yellow-v1.png', 'photo-wall-pin-blue-v1.png']
const TAPE_NAMES = ['photo-wall-tape-dots-v1.png', 'photo-wall-tape-stripes-v1.png', 'photo-wall-tape-green-v1.png']

// —— 灯泡拆分：把灯串拆成「电线底图」+「每颗灯泡精灵」+「位置清单」，供端上做逐灯随机闪烁 ——
// 灯泡 = 饱和暖色紧凑连通域（黑电线低饱和被排除、纸白背景被排除）
function detectBulbs(data, W, H) {
  const mask = new Uint8Array(W * H)
  for (let m = 0; m < W * H; m++) {
    const o = m * 4
    const minC = Math.min(data[o], data[o + 1], data[o + 2])
    const maxC = Math.max(data[o], data[o + 1], data[o + 2])
    if (maxC - minC > 22 && minC < 215) mask[m] = 1
  }
  const seen = new Uint8Array(W * H)
  const bulbs = []
  for (let start = 0; start < W * H; start++) {
    if (!mask[start] || seen[start]) continue
    let minX = W, minY = H, maxX = -1, maxY = -1, area = 0
    const q = [start]
    seen[start] = 1
    while (q.length) {
      const m = q.pop()
      area += 1
      const x = m % W, y = Math.floor(m / W)
      if (x < minX) minX = x; if (x > maxX) maxX = x
      if (y < minY) minY = y; if (y > maxY) maxY = y
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
        const nm = ny * W + nx
        if (mask[nm] && !seen[nm]) { seen[nm] = 1; q.push(nm) }
      }
    }
    const bw = maxX - minX + 1, bh = maxY - minY + 1
    if (area < 3000) continue
    if (bw < W * 0.02 || bw > W * 0.14) continue
    const aspect = bw / bh
    if (aspect < 0.35 || aspect > 1.5) continue
    bulbs.push({ minX, minY, maxX, maxY, w: bw, h: bh })
  }
  bulbs.sort((p, q) => p.minX - q.minX)
  return bulbs
}

// 电线底图：灯泡区域只保留黑色电线（低饱和深色），其余置透明（灯座随灯泡精灵走）
function eraseBulbsKeepCable(raw, data, W, H, bulbs) {
  const outBuf = Buffer.from(raw)
  for (const bulb of bulbs) {
    const pad = Math.round(Math.max(bulb.w, bulb.h) * 0.7)
    const x0 = Math.max(0, bulb.minX - pad), x1 = Math.min(W - 1, bulb.maxX + pad)
    const y0 = Math.max(0, bulb.minY - pad), y1 = Math.min(H - 1, bulb.maxY + pad)
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const o = (y * W + x) * 4
        const minC = Math.min(data[o], data[o + 1], data[o + 2])
        const maxC = Math.max(data[o], data[o + 1], data[o + 2])
        if (!(maxC - minC < 30 && minC < 90)) { outBuf[o] = 0; outBuf[o + 1] = 0; outBuf[o + 2] = 0; outBuf[o + 3] = 0 }
      }
    }
  }
  return outBuf
}

function bboxOf(boxes, W, H, pad) {
  let minX = W, minY = H, maxX = -1, maxY = -1
  for (const b of boxes) {
    if (b.minX < minX) minX = b.minX; if (b.maxX > maxX) maxX = b.maxX
    if (b.minY < minY) minY = b.minY; if (b.maxY > maxY) maxY = b.maxY
  }
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad)
  maxX = Math.min(W - 1, maxX + pad); maxY = Math.min(H - 1, maxY + pad)
  return { minX, minY, maxX, maxY, w: maxX - minX + 1, h: maxY - minY + 1 }
}

const report = []

for (const source of SOURCES) {
  const { file, W, H, data, raw, groups } = await processSource(source)
  if (source.mode === 'glow') {
    // 灯串拆分：电线底图 + 每颗灯泡精灵 + 位置清单（端上做逐灯随机闪烁）
    const bulbs = detectBulbs(data, W, H)
    console.log(`检测到灯泡 ${bulbs.length} 颗`)
    if (bulbs.length < 6 || bulbs.length > 14) throw new Error(`灯泡检测数量异常: ${bulbs.length}`)
    const baseRaw = eraseBulbsKeepCable(raw, data, W, H, bulbs)
    const cableBoxes = components(baseRaw, W, H).filter((b) => b.area >= 400)
    const stringBox = bboxOf(cableBoxes, W, H, 4)
    const croppedBase = await sharp(baseRaw, { raw: { width: W, height: H, channels: 4 } })
      .extract({ left: stringBox.minX, top: stringBox.minY, width: stringBox.w, height: stringBox.h })
      .png().toBuffer()
    const resizedBase = await sharp(croppedBase).resize({ width: 640, kernel: 'lanczos3' }).png().toBuffer()
    const baseMeta = await sharp(resizedBase).raw().toBuffer({ resolveWithObject: true })
    const baseOut = await png8(baseMeta.data, baseMeta.info.width, baseMeta.info.height, 1)
    await writeFile(resolve(outDir, 'photo-wall-lights-v1.png'), baseOut)
    report.push({ name: 'photo-wall-lights-v1.png (电线底图)', width: baseMeta.info.width, height: baseMeta.info.height, bytes: baseOut.byteLength })

    const CELL = 64
    const cells = []
    const rects = []
    for (const bulb of bulbs) {
      // 方形裁切（含光晕）；resize 撑满格子 + 位置框用同一矩形 → 叠加时与底图电线逐像素对齐
      const pad = Math.round(Math.max(bulb.w, bulb.h) * 0.35)
      const side = Math.max(bulb.w, bulb.h) + pad * 2
      const cx = (bulb.minX + bulb.maxX) / 2, cy = (bulb.minY + bulb.maxY) / 2
      const x0 = Math.max(0, Math.round(cx - side / 2)), y0 = Math.max(0, Math.round(cy - side / 2))
      const x1 = Math.min(W - 1, x0 + side - 1), y1 = Math.min(H - 1, y0 + side - 1)
      rects.push({ x0, y0, x1, y1 })
      const crop = await sharp(raw, { raw: { width: W, height: H, channels: 4 } })
        .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
        .resize(CELL, CELL, { kernel: 'lanczos3' })
        .png().toBuffer()
      cells.push(await sharp(crop).raw().toBuffer({ resolveWithObject: true }))
    }
    const composites = []
    for (const [i, cell] of cells.entries()) {
      composites.push({
        input: await sharp(cell.data, { raw: { width: cell.info.width, height: cell.info.height, channels: 4 } }).png().toBuffer(),
        left: i * CELL,
        top: 0,
      })
    }
    const sheetPng = await sharp({
      create: { width: CELL * cells.length, height: CELL, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    }).composite(composites).png().toBuffer()
    const sheetRaw = await sharp(sheetPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const sheetOut = await png8(sheetRaw.data, sheetRaw.info.width, sheetRaw.info.height, 1)
    await writeFile(resolve(outDir, 'photo-wall-bulbs-v1.png'), sheetOut)
    report.push({ name: `photo-wall-bulbs-v1.png (${cells.length} 灯泡)`, width: sheetRaw.info.width, height: sheetRaw.info.height, bytes: sheetOut.byteLength })

    // 位置清单：相对电线底图（640 宽盒）的百分比几何 + 确定性随机闪烁参数
    const scale = 640 / stringBox.w
    const h640 = Math.round(stringBox.h * scale)
    const round = (n) => Math.round(n * 100) / 100
    const items = bulbs.map((bulb, i) => {
      const rect = rects[i]
      return {
        cell: i,
        left: round(((rect.x0 - stringBox.minX) * scale) / 640 * 100),
        top: round(((rect.y0 - stringBox.minY) * scale) / h640 * 100),
        width: round(((rect.x1 - rect.x0 + 1) * scale) / 640 * 100),
        height: round(((rect.y1 - rect.y0 + 1) * scale) / h640 * 100),
        delay: round(((i * 13) % 17) * 0.23),
        duration: round(2.1 + ((i * 7) % 9) * 0.19),
      }
    })
    const ts = `// 由 miniapp/tools/make-photo-wall-decor.mjs 自动生成：灯泡精灵在灯串盒（等比 640 宽）内的百分比几何与随机闪烁参数。\n// 手改无效，重跑工具会覆盖。\nexport interface PhotoWallBulb {\n  cell: number\n  left: number\n  top: number\n  width: number\n  height: number\n  delay: number\n  duration: number\n}\n\nexport const PHOTO_WALL_BULBS: PhotoWallBulb[] = ${JSON.stringify(items, null, 2)}\n`
    await writeFile(resolve(root, 'miniapp/src/features/main/photoWallLightsBulbs.ts'), ts)
    report.push({ name: 'photoWallLightsBulbs.ts', bytes: Buffer.byteLength(ts) })
  } else if (source.mode === 'solid') {
    for (const [i, group] of groups.entries()) {
      report.push(await cropAndSave(group, W, H, raw, PIN_NAMES[i] ?? `pin-extra-${i}.png`, { height: 68, kernel: 'lanczos3' }, 0))
    }
  } else {
    for (const [i, group] of groups.entries()) {
      report.push(await cropAndSave(group, W, H, raw, TAPE_NAMES[i] ?? `tape-extra-${i}.png`, { width: 200, kernel: 'lanczos3' }, 0))
    }
  }
}

for (const item of report) console.log(`${item.name}: ${item.width ?? '-'}x${item.height ?? '-'} ${Math.round(item.bytes / 1024)}KB`)
