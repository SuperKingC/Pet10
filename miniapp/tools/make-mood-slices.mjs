// 从 design-assets/nest/mood-four-source.jpg 生成宠物四心情贴纸切片（写日记心情选择器用）：
//  1) 归档图降采样到 1280 宽（仅首次），按标定矩形裁出四张卡片
//  2) 卡 1/4 的浅灰圆盘：按几何圆环（中心/半径标定）擦除灰环线，圆盘底与卡白同为近白
//  3) 边界洪泛（对参考白色欧氏色距 ≤ 容差）吃掉卡白 + 圆盘底；淡蓝雨滴/泪滴/汗滴与
//     高饱和装饰（云、爱心、星星、腮红、短线）色距远，自动保留
//  4) 贴透明区边缘做亮度渐变 alpha（软边），裁 alpha 包围盒、方形居中、缩放输出
//  5) 有 sharp 时量化回 PNG8（与线上格式一致），无 sharp 回退真彩 PNG
// 心情语义与 journalModel 的 JOURNAL_MOODS 对齐：1 难过 / 2 平静 / 3 开心 / 4 兴奋
// design-assets 已 gitignore（source-only 仅本地留存）。用法：node tools/make-mood-slices.mjs
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { deflateSync, inflateSync } from 'node:zlib'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
// 归档源图：首跑后为 mood-four-source.jpg（1280px JPEG）；也接受 .png（首次 2048px 原图）
const srcBase = resolve(here, '../../design-assets/nest/mood-four-source')
const srcPath = [`${srcBase}.png`, `${srcBase}.jpg`].find((p) => existsSync(p))
if (!srcPath) throw new Error('缺少 design-assets/nest/mood-four-source.png/.jpg 源图')
const outDir = resolve(here, '../src/assets/moods')

// 归档图最大宽度（与信纸管线一致，便于日后重切）
const SOURCE_ARCHIVE_MAX = 1280
// 输出贴纸边长：日记心情选择器展示 120rpx（@3x ≈ 200px）
const OUTPUT_SIZE = 200
// 输出文件名：同路径图片会被开发者工具缓存供旧图（cache --clean 清不掉），换图必须升文件名
const OUTPUT_VERSION = 'v3'
// 洪泛容差：对参考白（卡白/盘底）的 RGB 欧氏色距；雨滴色距 ~34、灰环 ~42，须远大于卡白-盘底差 (~5)
const FLOOD_TOL = 14
// 边缘 alpha 渐变：色距 EDGE_FROM 全透明 → EDGE_TO 全不透明
// （EDGE_FROM 须 ≥ 卡白-盘底色距 ~5：贴透明区的近白残留直接归零，避免淡圆弧残影）
const EDGE_FROM = 8
const EDGE_TO = 26

// 四张卡片在 2048 原图上的标定矩形（来自 tools/tmp-mood-probe2/3.mjs 阴影带目视校准）
// 文件名序号即心情语义：mood-1 委屈哭=难过、mood-2 汗滴=平静、mood-3 吐舌=开心、mood-4 腮红眯眼=兴奋
const CARDS_2048 = [
  { name: 'mood-1', x: 117, y: 79, disc: { cx: 516.5, cy: 478.5, r: 357.5 } },
  { name: 'mood-2', x: 1119, y: 79, disc: null },
  { name: 'mood-3', x: 117, y: 1027, disc: null },
  { name: 'mood-4', x: 1119, y: 1027, disc: { cx: 1518.5, cy: 1426.5, r: 357.5 } },
]
const CARD_SIZE = 799

// ---------- PNG 解码（8bit 非隔行：RGBA / RGB / 调色板+可选 tRNS） ----------
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
  let trns = null
  let palette = null
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
    } else if (type === 'PLTE') palette = data
    else if (type === 'tRNS') trns = data
    else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    pos += 12 + length
  }
  const paletteMode = colorType === 3
  if (bitDepth !== 8 || interlace !== 0 || (colorType !== 6 && colorType !== 2 && !paletteMode)) {
    throw new Error(`暂不支持的 PNG 格式：bit=${bitDepth} color=${colorType} interlace=${interlace}`)
  }
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1
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
      if (paletteMode) {
        const idx = cur[si]
        rgba[di] = palette[idx * 3]
        rgba[di + 1] = palette[idx * 3 + 1]
        rgba[di + 2] = palette[idx * 3 + 2]
        rgba[di + 3] = trns && idx < trns.length ? trns[idx] : 255
      } else {
        rgba[di] = cur[si]
        rgba[di + 1] = cur[si + 1]
        rgba[di + 2] = cur[si + 2]
        rgba[di + 3] = channels === 4 ? cur[si + 3] : 255
      }
    }
    prev = cur
  }
  return { width, height, rgba }
}

// ---------- PNG 编码（RGBA，逐行最小绝对和滤波） ----------
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
  for (let i = 0; i < buf.length; i += 1) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
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

function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  if (pb <= pc) return b
  return c
}

function writePngRgba(path, width, height, rgba) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  const filtered = Buffer.alloc(stride)
  for (let y = 0; y < height; y += 1) {
    const line = rgba.subarray(y * stride, (y + 1) * stride)
    const candidates = []
    for (let filter = 0; filter <= 4; filter += 1) {
      let sum = 0
      for (let i = 0; i < stride; i += 1) {
        const x = line[i]
        const a = i >= 4 ? line[i - 4] : 0
        const b = y > 0 ? rgba[(y - 1) * stride + i] : 0
        const c = y > 0 && i >= 4 ? rgba[(y - 1) * stride + i - 4] : 0
        let v
        if (filter === 0) v = x
        else if (filter === 1) v = x - a
        else if (filter === 2) v = x - b
        else if (filter === 3) v = x - ((a + b) >> 1)
        else v = x - paeth(a, b, c)
        filtered[i] = v & 0xff
        sum += v < 0 ? -v : v
      }
      candidates.push({ filter, sum, bytes: Buffer.from(filtered) })
    }
    candidates.sort((p, q) => p.sum - q.sum)
    raw[y * (stride + 1)] = candidates[0].filter
    candidates[0].bytes.copy(raw, y * (stride + 1) + 1)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
  writeFileSync(path, png)
  return png.length
}

// ---------- 缩放（premultiplied alpha 面积平均，避免软边出黑边） ----------
function resizeArea(src, sw, sh, dw, dh) {
  const out = Buffer.alloc(dw * dh * 4)
  const xr = sw / dw
  const yr = sh / dh
  for (let dy = 0; dy < dh; dy += 1) {
    const y0 = dy * yr
    const y1 = y0 + yr
    for (let dx = 0; dx < dw; dx += 1) {
      const x0 = dx * xr
      const x1 = x0 + xr
      let sr = 0
      let sg = 0
      let sb = 0
      let sa = 0
      for (let y = Math.floor(y0); y < Math.min(sh, Math.ceil(y1)); y += 1) {
        const wy = Math.min(y1, y + 1) - Math.max(y0, y)
        for (let x = Math.floor(x0); x < Math.min(sw, Math.ceil(x1)); x += 1) {
          const wx = Math.min(x1, x + 1) - Math.max(x0, x)
          const area = wx * wy
          const si = (y * sw + x) * 4
          const alpha = (src[si + 3] / 255) * area
          sr += src[si] * alpha
          sg += src[si + 1] * alpha
          sb += src[si + 2] * alpha
          sa += alpha
        }
      }
      const di = (dy * dw + dx) * 4
      if (sa > 0) {
        out[di] = Math.round(sr / sa)
        out[di + 1] = Math.round(sg / sa)
        out[di + 2] = Math.round(sb / sa)
        out[di + 3] = Math.round((sa / (xr * yr)) * 255)
      }
    }
  }
  return out
}

function cropImg(img, box) {
  const out = Buffer.alloc(box.w * box.h * 4)
  for (let y = 0; y < box.h; y += 1) {
    img.rgba.copy(out, y * box.w * 4, ((box.y + y) * img.width + box.x) * 4, ((box.y + y) * img.width + box.x + box.w) * 4)
  }
  return { width: box.w, height: box.h, rgba: out }
}

// ---------- 主流程 ----------
// 归档源图为 JPEG（白底不透明，切图只需 RGB）；.png 分支保留给首次 2048px 原图直跑
async function readSourceRgba(path) {
  if (/\.jpe?g$/i.test(path)) {
    const { default: sharp } = await import('sharp')
    const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    return { width: info.width, height: info.height, rgba: Buffer.from(data) }
  }
  return readPngRgba(path)
}
let image = await readSourceRgba(srcPath)
const originalSize = { width: image.width, height: image.height }

// 1) 归档图降采样回写（仅首次运行需要）
if (image.width > SOURCE_ARCHIVE_MAX) {
  const scale = SOURCE_ARCHIVE_MAX / image.width
  const dh = Math.round(image.height * scale)
  const rgba = resizeArea(image.rgba, image.width, image.height, SOURCE_ARCHIVE_MAX, dh)
  // 源图为白底不透明四格拼图，归档转 JPEG（check-assets 对 design-assets 也执行运行时体积预算，
  // PNG 归档 1.6MB 超 1MB error 线；JPEG 与 xiaoduoli-in-box-source.jpg 先例一致）
  let bytes
  try {
    const { default: sharp } = await import('sharp')
    const info = await sharp(rgba, { raw: { width: SOURCE_ARCHIVE_MAX, height: dh, channels: 4 } })
      .jpeg({ quality: 90, chromaSubsampling: '4:4:4' })
      .toFile(srcPath.replace(/\.png$/i, '.jpg'))
    bytes = info.size
  } catch {
    bytes = writePngRgba(srcPath, SOURCE_ARCHIVE_MAX, dh, rgba)
  }
  console.log(`archive: ${originalSize.width}x${originalSize.height} -> ${SOURCE_ARCHIVE_MAX}x${dh}, ${(bytes / 1024).toFixed(0)} KB`)
  image = { width: SOURCE_ARCHIVE_MAX, height: dh, rgba }
}

const archScale = image.width / 2048
const dist2 = (img, i, ref) => {
  const dr = img.rgba[i] - ref[0]
  const dg = img.rgba[i + 1] - ref[1]
  const db = img.rgba[i + 2] - ref[2]
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

// 2) 逐卡处理
const results = []
for (const card of CARDS_2048) {
  const box = {
    x: Math.round(card.x * archScale),
    y: Math.round(card.y * archScale),
    w: Math.round(CARD_SIZE * archScale),
    h: Math.round(CARD_SIZE * archScale),
  }
  const cardImg = cropImg(image, box)
  const { width: w, height: h, rgba } = cardImg

  // 参考白色 = 四角 5x5 均值（卡白与圆盘底都在容差内）
  let rr = 0
  let rg = 0
  let rb = 0
  let n = 0
  for (const [cx0, cy0] of [[0, 0], [w - 5, 0], [0, h - 5], [w - 5, h - 5]]) {
    for (let y = cy0; y < cy0 + 5; y += 1) {
      for (let x = cx0; x < cx0 + 5; x += 1) {
        const i = (y * w + x) * 4
        rr += rgba[i]; rg += rgba[i + 1]; rb += rgba[i + 2]; n += 1
      }
    }
  }
  const ref = [Math.round(rr / n), Math.round(rg / n), Math.round(rb / n)]

  // 3) 圆盘灰环擦除（仅卡 1/4）：环带内低饱和浅灰（环线及其抗锯齿）替换为参考白，
  //    洪泛即可穿过；彩色/深色（被环遮住的毛发、装饰）保留
  let ringErased = 0
  if (card.disc) {
    const cx = (card.disc.cx - card.x) * archScale
    const cy = (card.disc.cy - card.y) * archScale
    const r = card.disc.r * archScale
    // 环带加宽到 ±28px（归档图尺度）：盖住环线抗锯齿边与轻微的圆心标定误差，防淡弧残影
    const rIn = r - 28 * archScale
    const rOut = r + 28 * archScale
    for (let y = Math.max(0, Math.floor(cy - rOut)); y <= Math.min(h - 1, Math.ceil(cy + rOut)); y += 1) {
      for (let x = Math.max(0, Math.floor(cx - rOut)); x <= Math.min(w - 1, Math.ceil(cx + rOut)); x += 1) {
        const dx = x - cx
        const dy = y - cy
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d < rIn || d > rOut) continue
        const i = (y * w + x) * 4
        const R = rgba[i]
        const G = rgba[i + 1]
        const B = rgba[i + 2]
        const lum = 0.299 * R + 0.587 * G + 0.114 * B
        const spread = Math.max(R, G, B) - Math.min(R, G, B)
        if (lum >= 190 && spread <= 42) {
          rgba[i] = ref[0]; rgba[i + 1] = ref[1]; rgba[i + 2] = ref[2]; rgba[i + 3] = 255
          ringErased += 1
        }
      }
    }
  }

  // 4) 边界洪泛：从四边种子出发，色距参考白 ≤ 容差的近白像素全部置透明
  const stack = []
  const state = new Uint8Array(w * h) // 0 未访问 1 透明
  const trySeed = (x, y) => {
    const i = (y * w + x) * 4
    if (rgba[i + 3] === 0) return
    if (dist2(cardImg, i, ref) <= FLOOD_TOL) {
      state[y * w + x] = 1
      stack.push(x, y)
    }
  }
  for (let x = 0; x < w; x += 1) { trySeed(x, 0); trySeed(x, h - 1) }
  for (let y = 0; y < h; y += 1) { trySeed(0, y); trySeed(w - 1, y) }
  while (stack.length) {
    const y = stack.pop()
    const x = stack.pop()
    const i = (y * w + x) * 4
    rgba[i + 3] = 0
    if (x > 0 && !state[y * w + x - 1]) { state[y * w + x - 1] = 1; if (dist2(cardImg, i - 4, ref) <= FLOOD_TOL) stack.push(x - 1, y) }
    if (x < w - 1 && !state[y * w + x + 1]) { state[y * w + x + 1] = 1; if (dist2(cardImg, i + 4, ref) <= FLOOD_TOL) stack.push(x + 1, y) }
    if (y > 0 && !state[(y - 1) * w + x]) { state[(y - 1) * w + x] = 1; if (dist2(cardImg, i - w * 4, ref) <= FLOOD_TOL) stack.push(x, y - 1) }
    if (y < h - 1 && !state[(y + 1) * w + x]) { state[(y + 1) * w + x] = 1; if (dist2(cardImg, i + w * 4, ref) <= FLOOD_TOL) stack.push(x, y + 1) }
  }

  // 5) 贴透明区边缘的亮度渐变 alpha（软边抗锯齿）：色距 EDGE_FROM→EDGE_TO 映射 0→255
  for (let pass = 0; pass < 2; pass += 1) {
    const snapshot = Buffer.from(rgba)
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const i = (y * w + x) * 4
        if (snapshot[i + 3] === 0) continue
        let nearTransparent = false
        for (let dy = -1; dy <= 1 && !nearTransparent; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
            if (snapshot[(ny * w + nx) * 4 + 3] === 0) { nearTransparent = true; break }
          }
        }
        if (!nearTransparent) continue
        const d = dist2(cardImg, i, ref)
        const t = Math.max(0, Math.min(1, (d - EDGE_FROM) / (EDGE_TO - EDGE_FROM)))
        rgba[i + 3] = Math.round(255 * t)
      }
    }
  }

  // 6) alpha 包围盒（阈值 8）→ 方形画布居中（留 3px 边距）
  let x0 = w
  let y0 = h
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (rgba[(y * w + x) * 4 + 3] >= 8) {
        if (x < x0) x0 = x
        if (y < y0) y0 = y
        if (x > x1) x1 = x
        if (y > y1) y1 = y
      }
    }
  }
  if (x1 < 0) throw new Error(`${card.name} 整图透明`)
  const bw = x1 - x0 + 1
  const bh = y1 - y0 + 1
  const side = Math.max(bw, bh) + 6
  const canvas = Buffer.alloc(side * side * 4)
  for (let y = 0; y < bh; y += 1) {
    const srcStart = ((y0 + y) * w + x0) * 4
    const dstStart = ((y + Math.floor((side - bh) / 2)) * side + Math.floor((side - bw) / 2)) * 4
    rgba.copy(canvas, dstStart, srcStart, srcStart + bw * 4)
  }

  // 7) 缩放到输出尺寸
  const out = resizeArea(canvas, side, side, OUTPUT_SIZE, OUTPUT_SIZE)

  // 8) 写文件：有 sharp 量化 PNG8，否则真彩 PNG
  const outFile = `${card.name}-${OUTPUT_VERSION}.png`
  const outPath = resolve(outDir, outFile)
  let bytes
  try {
    const { default: sharp } = await import('sharp')
    const info = await sharp(out, { raw: { width: OUTPUT_SIZE, height: OUTPUT_SIZE, channels: 4 } })
      .png({ palette: true, quality: 100, dither: 1 })
      .toFile(outPath)
    bytes = info.size
  } catch {
    bytes = writePngRgba(outPath, OUTPUT_SIZE, OUTPUT_SIZE, out)
  }
  results.push({ file: outFile, box, ref, ringErased, bbox: { x: x0, y: y0, w: bw, h: bh }, kb: Number((bytes / 1024).toFixed(1)) })
  console.log(`${card.name}: ref=${ref} ringErased=${ringErased} bbox=${bw}x${bh} -> ${OUTPUT_SIZE}x${OUTPUT_SIZE} ${results[results.length - 1].kb}KB`)
}

// 9) 调试蒙太奇：暖色底上四张贴纸（查边缘光晕/残留）+ 棋盘格透明底（查 alpha）
const MONTAGE_BG = [247, 232, 200]
const TILE = OUTPUT_SIZE
const GAP = 12
const COLS = 4
const montageW = COLS * TILE + (COLS + 1) * GAP
const montageH = 2 * TILE + 3 * GAP
const montage = Buffer.alloc(montageW * montageH * 4)
for (let i = 0; i < montageW * montageH; i += 1) {
  const checker = ((Math.floor((i % montageW) / 12) + Math.floor(Math.floor(i / montageW) / 12)) % 2) === 0
  const base = i < (montageW * montageH) / 2 ? MONTAGE_BG : checker ? [230, 230, 230] : [200, 200, 200]
  montage[i * 4] = base[0]; montage[i * 4 + 1] = base[1]; montage[i * 4 + 2] = base[2]; montage[i * 4 + 3] = 255
}
for (let idx = 0; idx < results.length; idx += 1) {
  const card = CARDS_2048[idx]
  const raw = readPngRgba(resolve(outDir, `${card.name}-${OUTPUT_VERSION}.png`))
  const x0 = GAP + (idx % COLS) * (TILE + GAP)
  for (let row = 0; row < 2; row += 1) {
    const y0 = GAP + row * (TILE + 2 * GAP)
    for (let y = 0; y < TILE; y += 1) {
      for (let x = 0; x < TILE; x += 1) {
        const si = (y * TILE + x) * 4
        const a = raw.rgba[si + 3] / 255
        if (a === 0) continue
        const di = ((y0 + y) * montageW + x0 + x) * 4
        montage[di] = Math.round(raw.rgba[si] * a + montage[di] * (1 - a))
        montage[di + 1] = Math.round(raw.rgba[si + 1] * a + montage[di + 1] * (1 - a))
        montage[di + 2] = Math.round(raw.rgba[si + 2] * a + montage[di + 2] * (1 - a))
      }
    }
  }
}
const montageBytes = writePngRgba(resolve(here, 'mood-debug-montage.png'), montageW, montageH, montage)
console.log(`montage: tools/mood-debug-montage.png ${(montageBytes / 1024).toFixed(0)}KB`)
console.log(JSON.stringify({ source: srcPath.replaceAll('\\', '/').slice(srcPath.indexOf('design-assets')), archive: { width: image.width, height: image.height }, output: OUTPUT_SIZE, floodTol: FLOOD_TOL, results }, null, 2))
