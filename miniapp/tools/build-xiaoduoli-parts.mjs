// 出生即分层管线（原图直出 + 眼部木偶拆解）：
//  1) xiaoduoli-body.png   = design-assets/nest/xiaoduoli-peek-source.png 原图直出（不修补、不抠图）
//  2) xiaoduoli-eyes.png   = 眼眶底层：眼区矩形裁切，瞳孔原位用虹膜色平滑填充（供瞳孔滑动，不露底图重影）
//  3) xiaoduoli-pupils.png = 瞳孔圆盘层：从原图裁出双眼瞳孔盘，瞟眼时在眼眶内滑动（静止时逐像素对位）
//  4) xiaoduoli-lids.png   = 眼睑层：按眼上下毛色渐变绘制的闭眼状态（含闭眼线），眨眼时淡入淡出
// 禁止修补式反抠（inpaint 补洞 / 阈值抠 alpha）；所有填充只用采样到的平滑色。改完必须重跑并同步文档。
// 用法：node tools/build-xiaoduoli-parts.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { inflateSync, deflateSync } from 'node:zlib'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const srcPath = resolve(here, '../../design-assets/nest/xiaoduoli-peek-source.png')
const outDir = resolve(here, '../src/assets/nest')
const reportPath = resolve(here, './xiaoduoli-parts.report.json')

const CANVAS = { width: 446, height: 314 }
const FEATHER = 6
const PUPIL = { solidR: 14, rampR: 18, slidePx: 6 }
// 眼睛几何（画布坐标，来自既有目视标定）：眼区矩形 + 中心
const EYES = [
  { name: 'left', rect: { x: 128, y: 147, w: 62, h: 64 } },
  { name: 'right', rect: { x: 260, y: 136, w: 64, h: 70 } },
]
const PAD = 6

// ---------- PNG 解码（RGBA 8bit 非隔行） ----------
function readPngRgba(path) {
  const buf = readFileSync(path)
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('不是 PNG 文件')
  let pos = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  let interlace = 0
  const idat = []
  while (pos < buf.length) {
    const length = buf.readUInt32BE(pos)
    const type = buf.toString('ascii', pos + 4, pos + 8)
    const data = buf.subarray(pos + 8, pos + 8 + length)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
      interlace = data[12]
    } else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    pos += 12 + length
  }
  if (bitDepth !== 8 || interlace !== 0 || (colorType !== 6 && colorType !== 2)) {
    throw new Error(`暂不支持的 PNG 格式：bit=${bitDepth} color=${colorType} interlace=${interlace}`)
  }
  const channels = colorType === 6 ? 4 : 3
  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const rgba = Buffer.alloc(width * height * 4)
  let prev = Buffer.alloc(stride)
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)]
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    const cur = Buffer.alloc(stride)
    for (let i = 0; i < stride; i += 1) {
      const a = i >= channels ? cur[i - channels] : 0
      const b = prev[i]
      const c = i >= channels ? prev[i - channels] : 0
      let v = line[i]
      if (filter === 1) v += a
      else if (filter === 2) v += b
      else if (filter === 3) v += (a + b) >> 1
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      cur[i] = v & 0xff
    }
    for (let x = 0; x < width; x += 1) {
      const si = x * channels
      const di = (y * width + x) * 4
      rgba[di] = cur[si]
      rgba[di + 1] = cur[si + 1]
      rgba[di + 2] = cur[si + 2]
      rgba[di + 3] = channels === 4 ? cur[si + 3] : 255
    }
    prev = cur
  }
  return { width, height, rgba }
}

// ---------- PNG 编码（RGBA，filter 0） ----------
const crcTable = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = -1
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}

function writePngRgba(path, width, height, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
  writeFileSync(path, png)
  return png.length
}

const src = readPngRgba(srcPath)
if (src.width !== CANVAS.width || src.height !== CANVAS.height) {
  throw new Error(`原图尺寸 ${src.width}x${src.height} 与画布不符`)
}
const srcAt = (x, y) => {
  const i = (y * CANVAS.width + x) * 4
  return [src.rgba[i], src.rgba[i + 1], src.rgba[i + 2], src.rgba[i + 3]]
}
const blendPx = (buf, x, y, rgb, alpha) => {
  const i = (y * CANVAS.width + x) * 4
  const a = alpha / 255
  buf[i] = Math.round(buf[i] * (1 - a) + rgb[0] * a)
  buf[i + 1] = Math.round(buf[i + 1] * (1 - a) + rgb[1] * a)
  buf[i + 2] = Math.round(buf[i + 2] * (1 - a) + rgb[2] * a)
  buf[i + 3] = Math.min(255, buf[i + 3] + alpha)
}

// ---------- 1) 身体层：原图直出 ----------
const bodyBytes = writePngRgba(resolve(outDir, 'xiaoduoli-body.png'), CANVAS.width, CANVAS.height, src.rgba)

// ---------- 2) 眼眶底层：眼区裁切 + 瞳孔原位虹膜色填充 ----------
const eyes = Buffer.alloc(CANVAS.width * CANVAS.height * 4)
const rig = []
for (const eye of EYES) {
  const { x, y, w, h } = eye.rect
  const cx = x + Math.floor(w / 2)
  const cy = y + Math.floor(h / 2)
  // 虹膜填充色 = 瞳孔盘外圈（r solidR+2 .. rampR+2）平均色
  let sr = 0
  let sg = 0
  let sb = 0
  let n = 0
  for (let dy = -PUPIL.rampR - 2; dy <= PUPIL.rampR + 2; dy += 1) {
    for (let dx = -PUPIL.rampR - 2; dx <= PUPIL.rampR + 2; dx += 1) {
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d < PUPIL.solidR + 2 || d > PUPIL.rampR + 2) continue
      const [r, g, b, a] = srcAt(cx + dx, cy + dy)
      if (a < 200) continue
      sr += r; sg += g; sb += b; n += 1
    }
  }
  if (n === 0) throw new Error(`${eye.name} 虹膜采样失败`)
  const iris = [Math.round(sr / n), Math.round(sg / n), Math.round(sb / n)]
  // 眼区矩形（含 PAD）拷贝 + 边缘羽化
  const rect = { x: x - PAD, y: y - PAD, w: w + PAD * 2, h: h + PAD * 2 }
  for (let py = 0; py < rect.h; py += 1) {
    for (let px = 0; px < rect.w; px += 1) {
      const sx = rect.x + px
      const sy = rect.y + py
      const [r, g, b, a] = srcAt(sx, sy)
      const edge = Math.min(px, py, rect.w - 1 - px, rect.h - 1 - py)
      const outA = Math.min(a, edge >= FEATHER ? 255 : Math.round((255 * edge) / FEATHER))
      const di = (sy * CANVAS.width + sx) * 4
      eyes[di] = r; eyes[di + 1] = g; eyes[di + 2] = b; eyes[di + 3] = outA
    }
  }
  // 瞳孔原位填充虹膜色（实心 r solidR，到 rampR 渐隐）
  for (let dy = -PUPIL.rampR; dy <= PUPIL.rampR; dy += 1) {
    for (let dx = -PUPIL.rampR; dx <= PUPIL.rampR; dx += 1) {
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d > PUPIL.rampR) continue
      const alpha = d <= PUPIL.solidR ? 255 : Math.round(255 * (PUPIL.rampR - d) / (PUPIL.rampR - PUPIL.solidR))
      blendPx(eyes, cx + dx, cy + dy, iris, alpha)
    }
  }
  rig.push({ name: eye.name, rect, center: [cx, cy], irisFill: iris })
}
const eyesBytes = writePngRgba(resolve(outDir, 'xiaoduoli-eyes.png'), CANVAS.width, CANVAS.height, eyes)

// ---------- 3) 瞳孔层：原图瞳孔圆盘（实心 r solidR，向外渐隐） ----------
const pupils = Buffer.alloc(CANVAS.width * CANVAS.height * 4)
for (const { center } of rig) {
  const [cx, cy] = center
  for (let dy = -PUPIL.rampR; dy <= PUPIL.rampR; dy += 1) {
    for (let dx = -PUPIL.rampR; dx <= PUPIL.rampR; dx += 1) {
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d > PUPIL.rampR) continue
      const [r, g, b] = srcAt(cx + dx, cy + dy)
      const alpha = d <= PUPIL.solidR ? 255 : Math.round(255 * (PUPIL.rampR - d) / (PUPIL.rampR - PUPIL.solidR))
      const di = ((cy + dy) * CANVAS.width + (cx + dx)) * 4
      pupils[di] = r; pupils[di + 1] = g; pupils[di + 2] = b; pupils[di + 3] = alpha
    }
  }
}
const pupilsBytes = writePngRgba(resolve(outDir, 'xiaoduoli-pupils.png'), CANVAS.width, CANVAS.height, pupils)

// ---------- 4) 眼睑层：眼上下毛色渐变 + 闭眼线 ----------
const lids = Buffer.alloc(CANVAS.width * CANVAS.height * 4)
const avgCol = (x, y0, y1) => {
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  for (let y = y0; y <= y1; y += 1) {
    const [pr, pg, pb, pa] = srcAt(x, y)
    if (pa < 200) continue
    r += pr; g += pg; b += pb; n += 1
  }
  if (n === 0) return null
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)]
}
for (const { rect } of rig) {
  const { x, y, w, h } = rect
  for (let px = 0; px < w; px += 1) {
    const sx = x + px
    const top = avgCol(sx, Math.max(1, y - 9), Math.max(2, y - 3)) ?? [227, 170, 106]
    const bottom = avgCol(sx, Math.min(CANVAS.height - 2, y + h + 3), Math.min(CANVAS.height - 1, y + h + 9)) ?? [250, 225, 191]
    for (let py = 0; py < h; py += 1) {
      const sy = y + py
      const t = h > 1 ? py / (h - 1) : 0.5
      const rgb = [0, 1, 2].map((c) => Math.round(top[c] * (1 - t) + bottom[c] * t))
      const edge = Math.min(px, py, w - 1 - px, h - 1 - py)
      const alpha = edge >= FEATHER ? 255 : Math.round((255 * edge) / FEATHER)
      blendPx(lids, sx, sy, rgb, alpha)
    }
    // 闭眼线：位于眼高约 42% 处的柔和下弯弧
    const lineY = y + Math.round(h * 0.42)
    for (let dy = -1; dy <= 2; dy += 1) {
      const t = w > 1 ? px / (w - 1) : 0.5
      const arc = Math.round(2.5 * Math.sin(Math.PI * t))
      const ly = lineY + dy + arc
      if (ly < y + 2 || ly > y + h - 3) continue
      const strength = dy <= 0 ? 150 : 235 - (dy - 1) * 70
      const dark = [Math.round(top[0] * 0.42), Math.round(top[1] * 0.42), Math.round(top[2] * 0.42)]
      blendPx(lids, sx, ly, dark, strength)
    }
  }
}
const lidsBytes = writePngRgba(resolve(outDir, 'xiaoduoli-lids.png'), CANVAS.width, CANVAS.height, lids)

const report = {
  source: 'design-assets/nest/xiaoduoli-peek-source.png',
  canvas: CANVAS,
  rig: { eyes: EYES, pad: PAD, feather: FEATHER, pupil: PUPIL },
  parts: {
    body: { file: 'src/assets/nest/xiaoduoli-body.png', bytes: bodyBytes },
    eyes: { file: 'src/assets/nest/xiaoduoli-eyes.png', bytes: eyesBytes },
    pupils: { file: 'src/assets/nest/xiaoduoli-pupils.png', bytes: pupilsBytes },
    lids: { file: 'src/assets/nest/xiaoduoli-lids.png', bytes: lidsBytes },
  },
  generated: {
    scss: 'src/features/main/xiaoduoli-box-parts.generated.scss',
    // 眨眼 scaleY 的支点取两瞳孔中心的平均高度（占画布高度百分比）
    pupilsOriginYPct: Number(
      ((rig.reduce((sum, r) => sum + r.center[1], 0) / rig.length / CANVAS.height) * 100).toFixed(2),
    ),
  },
}
const scssPath = resolve(here, '../src/features/main/xiaoduoli-box-parts.generated.scss')
writeFileSync(
  scssPath,
  `/* 由 miniapp/tools/build-xiaoduoli-parts.mjs 自动生成，请勿手改；源：design-assets/nest/xiaoduoli-peek-source.png */\n.xiaoduoli-box__pupils {\n  transform-origin: 50% ${report.generated.pupilsOriginYPct}%;\n}\n`,
)
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)

console.log(JSON.stringify(report, null, 2))
