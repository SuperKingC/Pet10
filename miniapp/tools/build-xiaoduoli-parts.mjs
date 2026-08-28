// 出生即分层管线（原图直出 + 眼部木偶拆解）：
//  1) xiaoduoli-body.png   = design-assets/nest/xiaoduoli-peek-source.png 原图直出（不修补、不抠图）
//  2) xiaoduoli-eyes.png   = 眼眶底层：眼区矩形（大幅外扩）裁切，瞳孔原位用虹膜色平滑填充
//                            （供瞳孔滑动，不露底图重影；外扩量给眼窝底毛留出遮蔽余量）
//  3) xiaoduoli-pupils.png = 瞳孔圆盘层：从原图裁出双眼瞳孔盘，瞟眼时在眼眶内滑动（静止时逐像素对位）
//  4) xiaoduoli-underlay.png = 眼窝底毛：紧贴眼球的椭圆毛色垫层（按眼上下毛色逐列渐变采样），
//                            常驻位于眼眶层之下、静止时被完全遮蔽；眨眼时眼眶+瞳孔整组压扁露出底毛成闭眼
// 禁止修补式反抠（inpaint 补洞 / 阈值抠 alpha）；所有填充只用采样到的平滑色。改完必须重跑并同步文档。
// 用法：node tools/build-xiaoduoli-parts.mjs（全量，会重写全部四层）
//      node tools/build-xiaoduoli-parts.mjs --only=eyes,underlay（只重生成指定层，保留已压缩的其他层）
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
const PAD = 14
// 眼窝底毛参数：椭圆比眼区外扩 UNDERLAY.grow，d<UNDERLAY.solid 全不透明、到椭圆边渐隐；
// 椭圆必须整体落在眼眶层的不透明核心内（静止时被完全遮蔽），且实心半径须盖住眼球深色区域
const UNDERLAY = { grow: 7, solid: 0.88 }

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
  for (const b of buf) c = (crcTable[(c ^ b) & 0xff] ^ (c >>> 8)) >>> 0
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
// --only=<part[,part]>：只重生成指定层（如 eyes,underlay），避免全量重跑覆盖已压缩优化的其他层
const onlyArg = process.argv.find((arg) => arg.startsWith('--only='))
const onlyParts = onlyArg ? onlyArg.slice('--only='.length).split(',') : null
const wants = (part) => !onlyParts || onlyParts.includes(part)

const rig = EYES.map((eye) => ({
  name: eye.name,
  rect: {
    x: eye.rect.x - PAD,
    y: eye.rect.y - PAD,
    w: eye.rect.w + PAD * 2,
    h: eye.rect.h + PAD * 2,
  },
  center: [eye.rect.x + Math.floor(eye.rect.w / 2), eye.rect.y + Math.floor(eye.rect.h / 2)],
}))

// ---------- 1) 身体层：原图直出 ----------
const bodyBytes = wants('body')
  ? writePngRgba(resolve(outDir, 'xiaoduoli-body.png'), CANVAS.width, CANVAS.height, src.rgba)
  : 0

// ---------- 2) 眼眶底层：眼区裁切 + 瞳孔原位虹膜色填充 ----------
const eyesBytes = wants('eyes')
  ? (() => {
      const eyes = Buffer.alloc(CANVAS.width * CANVAS.height * 4)
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
      }
      return writePngRgba(resolve(outDir, 'xiaoduoli-eyes.png'), CANVAS.width, CANVAS.height, eyes)
    })()
  : 0

// ---------- 3) 瞳孔层：原图瞳孔圆盘（实心 r solidR，向外渐隐） ----------
const pupilsBytes = wants('pupils')
  ? (() => {
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
      return writePngRgba(resolve(outDir, 'xiaoduoli-pupils.png'), CANVAS.width, CANVAS.height, pupils)
    })()
  : 0

// ---------- 4) 眼窝底毛：椭圆毛色垫层（常驻藏于眼眶层下，眨眼压扁后露出） ----------
// 形状：眼区外扩 UNDERLAY.grow 的椭圆，d<UNDERLAY.solid 全不透明、到椭圆边渐隐；填色中心为
// 眼上/下方毛色竖向渐变，靠近边缘渐变到紧贴眼球上下的睫毛/眼窝阴影色，使垫层与眼窝阴影环
// 无缝衔接（否则浅色圆盘嵌在深色眼窝环里会显形）；不画闭眼线（由压扁的眼眶+瞳孔层自然形成）。
const underlayBytes = wants('underlay')
  ? (() => {
      const underlay = Buffer.alloc(CANVAS.width * CANVAS.height * 4)
      // 眼窝底毛填充源：两眼之间的鼻梁纯毛矩形（真实毛发纹理，实测色调与眼周一致
      // 243,197,143 vs 眼周 238-242,196-199,141-148），双眼共用同一源带，按椭圆 mask 裁形；
      // 源带向内收缩 5px 避开靠眼侧的暗边列；逐通道色彩对齐兜底；垫层全不透明。
      const srcX0 = 202
      const srcX1 = 248
      const srcInsetY = 8
      const bandSum = [0, 0, 0]
      let bandN = 0
      for (let py = 0; py < 40; py += 1) {
        for (let px = srcX0; px <= srcX1; px += 1) {
          const [pr, pg, pb, pa] = srcAt(px, 150 + py)
          if (pa < 200) continue
          bandSum[0] += pr; bandSum[1] += pg; bandSum[2] += pb
          bandN += 1
        }
      }
      const ringSum = [0, 0, 0]
      let ringN = 0
      for (const eye of EYES) {
        const cx = eye.rect.x + eye.rect.w / 2
        const cy = eye.rect.y + eye.rect.h / 2
        const aAxis = eye.rect.w / 2 + UNDERLAY.grow
        const bAxis = eye.rect.h / 2 + UNDERLAY.grow
        for (let py = Math.floor(cy - bAxis); py <= Math.ceil(cy + bAxis); py += 1) {
          for (let px = Math.floor(cx - aAxis); px <= Math.ceil(cx + aAxis); px += 1) {
            const dx = (px - cx) / aAxis
            const dy = (py - cy) / bAxis
            const d = Math.sqrt(dx * dx + dy * dy)
            // 只取最外圈纯毛环（避开眼球深色边缘把参考均值拉暗）
            if (d < 0.92 || d > 1) continue
            const [pr, pg, pb, pa] = srcAt(px, py)
            if (pa < 200) continue
            ringSum[0] += pr; ringSum[1] += pg; ringSum[2] += pb
            ringN += 1
          }
        }
      }
      if (ringN === 0 || bandN === 0) throw new Error('眼窝底毛色彩采样失败')
      const toneFactor = [0, 1, 2].map((c) =>
        Math.max(0.9, Math.min(1.1, ringSum[c] / ringN / (bandSum[c] / bandN))),
      )
      console.log(`[underlay] 源带均值 vs 眼周环均值 toneFactor=${toneFactor.map((f) => f.toFixed(3)).join(',')}`)
      for (const eye of EYES) {
        const { x, y, w, h } = eye.rect
        const cx = x + w / 2
        const cy = y + h / 2
        const aAxis = w / 2 + UNDERLAY.grow
        const bAxis = h / 2 + UNDERLAY.grow
        const x0 = Math.floor(cx - aAxis)
        const x1 = Math.ceil(cx + aAxis)
        const y0 = Math.floor(cy - bAxis)
        const y1 = Math.ceil(cy + bAxis)
        const srcY0 = Math.max(1, y - 16) + srcInsetY
        for (let py = y0; py <= y1; py += 1) {
          for (let px = x0; px <= x1; px += 1) {
            const dx = (px - cx) / aAxis
            const dy = (py - cy) / bAxis
            const d = Math.sqrt(dx * dx + dy * dy)
            if (d >= 1) continue
            const mask = d <= UNDERLAY.solid
              ? 255
              : Math.round(255 * (1 - (d - UNDERLAY.solid) / (1 - UNDERLAY.solid)))
            if (mask <= 0) continue
            // 双线性采样鼻梁源带（横向按带宽比例压缩）
            const gx = (px - x0) / (x1 - x0)
            const gy = (py - y0) / (y1 - y0)
            const fx = srcX0 + gx * (srcX1 - srcX0)
            const fy = srcY0 + gy * (2 * bAxis - srcInsetY * 2)
            const sx0 = Math.min(CANVAS.width - 2, Math.floor(fx))
            const sy0 = Math.min(CANVAS.height - 2, Math.floor(fy))
            const txr = fx - sx0
            const tyr = fy - sy0
            const rgb = [0, 1, 2].map((c) => {
              const c00 = srcAt(sx0, sy0)[c] * (1 - txr) + srcAt(sx0 + 1, sy0)[c] * txr
              const c01 = srcAt(sx0, sy0 + 1)[c] * (1 - txr) + srcAt(sx0 + 1, sy0 + 1)[c] * txr
              return Math.min(255, Math.round((c00 * (1 - tyr) + c01 * tyr) * toneFactor[c]))
            })
            blendPx(underlay, px, py, rgb, mask)
          }
        }
      }
      return writePngRgba(resolve(outDir, 'xiaoduoli-underlay.png'), CANVAS.width, CANVAS.height, underlay)
    })()
  : 0

const report = {
  source: 'design-assets/nest/xiaoduoli-peek-source.png',
  canvas: CANVAS,
  rig: { eyes: EYES, pad: PAD, feather: FEATHER, pupil: PUPIL, underlay: UNDERLAY },
  parts: {
    body: { file: 'src/assets/nest/xiaoduoli-body.png', bytes: bodyBytes },
    eyes: { file: 'src/assets/nest/xiaoduoli-eyes.png', bytes: eyesBytes },
    pupils: { file: 'src/assets/nest/xiaoduoli-pupils.png', bytes: pupilsBytes },
    underlay: { file: 'src/assets/nest/xiaoduoli-underlay.png', bytes: underlayBytes },
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
  `/* 由 miniapp/tools/build-xiaoduoli-parts.mjs 自动生成，请勿手改；源：design-assets/nest/xiaoduoli-peek-source.png */\n/* 眼组（眼眶+瞳孔）与瞳孔共用同一压扁支点：两瞳孔中心的平均高度 */\n.xiaoduoli-box__eye-group,\n.xiaoduoli-box__pupils {\n  transform-origin: 50% ${report.generated.pupilsOriginYPct}%;\n}\n`,
)
if (onlyParts) {
  // 局部重生成时保留其他层的既有记录，避免报告出现 0 字节误报
  try {
    const prev = JSON.parse(readFileSync(reportPath, 'utf8'))
    for (const key of Object.keys(report.parts)) {
      if (report.parts[key].bytes === 0 && prev.parts?.[key]) report.parts[key].bytes = prev.parts[key].bytes
    }
  } catch {}
}
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)

console.log(JSON.stringify(report, null, 2))
