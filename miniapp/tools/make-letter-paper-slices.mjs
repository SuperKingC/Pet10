// 从 design-assets/nest/letter-paper-source-v2.png 生成小窝信纸九宫格切片：
//  1) 按 alpha 包围盒裁掉透明边，再缩放到输出宽度后切成 9 块切片（四角固定、四边单轴拉伸、中心净区）
//  2) 有 sharp 时把切片量化回 PNG8（与线上格式一致，软阴影不糊），无 sharp 回退真彩 PNG
//  3) 输出 tools/letter-debug-*.png 标定图，切线常量靠目视校准
// 源图 v2：白底 JPG 经边界洪泛 + 亮度渐变 alpha 转真透明后归档（design-assets 已 gitignore，仅本地留存）。
// 用法：node tools/make-letter-paper-slices.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { deflateSync, inflateSync } from 'node:zlib'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const srcPath = resolve(here, '../../design-assets/nest/letter-paper-source-v2.png')
const outDir = resolve(here, '../src/assets/nest')

// 归档图最大宽度（保持 2 倍于输出宽度，便于日后重切）
const SOURCE_ARCHIVE_MAX = 1280
// 切片输出内容宽度（与旧 letter-paper.png 一致的清晰度量级）
const OUTPUT_WIDTH = 720

// 九宫格切线（裁边后内容宽高的百分比）：left/right/top/bottom
// 校准依据 tools/letter-debug-v2-grid.png：上切线落在信封翻盖与木夹下方的纸面净区
// （翻盖+木夹整体留在固定顶带，中带只拉纯色纸面）；下切线在爪印/小爱心上方的纸面净区；
// 右列罩住木夹与右下小信封装饰，左右切线两侧均为竖向边带，可随中行纵向拉伸。
// v2 源图构图与旧图接近，切线按旧图百分比换算并微调后经标定图目视确认。
// 全部 9 块由本脚本输出（v2 源图无需再手调 br 块）。
const SLICE = { left: 9, right: 30, top: 38.3, bottom: 46.1 }
// 供调用的 rpx 参考：与 MiniappNestLetter.scss 的卡片宽一致
const CARD_WIDTH_RPX = 680

// ---------- PNG 解码 ----------
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
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'IEND') {
      break
    }
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

// ---------- PNG 编码（RGBA，逐行最小绝对和滤波）----------
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

// ---------- 缩放（premultiplied alpha 面积平均，避免软阴影出黑边） ----------
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

// ---------- 主流程 ----------
let image = readPngRgba(srcPath)
const originalSize = { width: image.width, height: image.height }

// alpha 包围盒（阈值 6 保留软阴影）
function alphaBbox({ width, height, rgba }, threshold) {
  let x0 = width
  let y0 = height
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (rgba[(y * width + x) * 4 + 3] >= threshold) {
        if (x < x0) x0 = x
        if (y < y0) y0 = y
        if (x > x1) x1 = x
        if (y > y1) y1 = y
      }
    }
  }
  if (x1 < 0) throw new Error('整图透明')
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

function crop(img, box) {
  const out = Buffer.alloc(box.w * box.h * 4)
  for (let y = 0; y < box.h; y += 1) {
    img.rgba.copy(out, y * box.w * 4, ((box.y + y) * img.width + box.x) * 4, ((box.y + y) * img.width + box.x + box.w) * 4)
  }
  return { width: box.w, height: box.h, rgba: out }
}

// 1) 归档图降采样回写（仅首次运行需要）
if (image.width > SOURCE_ARCHIVE_MAX) {
  const scale = SOURCE_ARCHIVE_MAX / image.width
  const dh = Math.round(image.height * scale)
  const rgba = resizeArea(image.rgba, image.width, image.height, SOURCE_ARCHIVE_MAX, dh)
  const bytes = writePngRgba(srcPath, SOURCE_ARCHIVE_MAX, dh, rgba)
  console.log(`archive: ${originalSize.width}x${originalSize.height} -> ${SOURCE_ARCHIVE_MAX}x${dh}, ${(bytes / 1024).toFixed(0)} KB`)
  image = { width: SOURCE_ARCHIVE_MAX, height: dh, rgba }
}

// 2) 裁掉透明边
const contentBox = alphaBbox(image, 6)
const content = crop(image, contentBox)

// 3) 缩放到输出宽度
const outW = OUTPUT_WIDTH
const outH = Math.round((content.height / content.width) * outW)
const sheet = { width: outW, height: outH, rgba: resizeArea(content.rgba, content.width, content.height, outW, outH) }

// 4) 九宫格切线（输出图像素）
const px = {
  left: Math.round((SLICE.left / 100) * outW),
  right: outW - Math.round((SLICE.right / 100) * outW),
  top: Math.round((SLICE.top / 100) * outH),
  bottom: outH - Math.round((SLICE.bottom / 100) * outH),
}

// 5) 切 9 块
const tiles = {
  tl: { x: 0, y: 0, w: px.left, h: px.top },
  tc: { x: px.left, y: 0, w: px.right - px.left, h: px.top },
  tr: { x: px.right, y: 0, w: outW - px.right, h: px.top },
  ml: { x: 0, y: px.top, w: px.left, h: px.bottom - px.top },
  mc: { x: px.left, y: px.top, w: px.right - px.left, h: px.bottom - px.top },
  mr: { x: px.right, y: px.top, w: outW - px.right, h: px.bottom - px.top },
  bl: { x: 0, y: px.bottom, w: px.left, h: outH - px.bottom },
  bc: { x: px.left, y: px.bottom, w: px.right - px.left, h: outH - px.bottom },
  br: { x: px.right, y: px.bottom, w: outW - px.right, h: outH - px.bottom },
}
// 切片文件名带版本号：同路径图片会被开发者工具缓存供旧图（cache --clean 清不掉），换图必须升文件名
// v4：v2 源图（新构图信纸）首次切片；v2/v3 旧切片由本次任务删除
const tileFileName = (name) => `letter-paper-${name}-v4.png`

// 有 sharp 时量化回 PNG8（与既有线上切片格式一致，体积最小）；无 sharp 回退真彩 PNG
async function writeTile(path, tile) {
  try {
    const { default: sharp } = await import('sharp')
    const info = await sharp(tile.rgba, { raw: { width: tile.width, height: tile.height, channels: 4 } })
      .png({ palette: true, quality: 100, dither: 1 })
      .toFile(path)
    return info.size
  } catch {
    return writePngRgba(path, tile.width, tile.height, tile.rgba)
  }
}

const tileFiles = {}
for (const [name, box] of Object.entries(tiles)) {
  const tile = crop(sheet, box)
  const file = tileFileName(name)
  const bytes = await writeTile(resolve(outDir, file), tile)
  tileFiles[name] = { file, width: tile.width, height: tile.height, kb: Number((bytes / 1024).toFixed(1)) }
}

// 6) 标定图：整体网格 + 局部放大
function drawLines(img, lines, scale) {
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)
  const out = { width: w, height: h, rgba: resizeArea(img.rgba, img.width, img.height, w, h) }
  const put = (x, y, r, g, b) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return
    const i = (y * w + x) * 4
    out.rgba[i] = r
    out.rgba[i + 1] = g
    out.rgba[i + 2] = b
    out.rgba[i + 3] = 255
  }
  for (const [value, rgb] of lines) {
    const vertical = value.pxX !== undefined
    for (let t = -1; t <= 1; t += 1) {
      for (let s = 0; s < (vertical ? h : w); s += 1) {
        if (vertical) put(value.pxX * scale + t, s, ...rgb)
        else put(s, value.pxY * scale + t, ...rgb)
      }
    }
  }
  return out
}

const lines = [
  [{ pxX: px.left }, [255, 0, 0]],
  [{ pxX: px.right }, [255, 0, 0]],
  [{ pxY: px.top }, [255, 0, 0]],
  [{ pxY: px.bottom }, [255, 0, 0]],
]
writePngRgba(resolve(here, 'letter-debug-grid.png'), ...(obj => [obj.width, obj.height, obj.rgba])(drawLines(sheet, lines, 1)))

function debugCrop(name, x0pct, x1pct, y0pct, y1pct, scale) {
  const box = {
    x: Math.round((x0pct / 100) * outW),
    y: Math.round((y0pct / 100) * outH),
    w: Math.round(((x1pct - x0pct) / 100) * outW),
    h: Math.round(((y1pct - y0pct) / 100) * outH),
  }
  const region = crop(sheet, box)
  const local = [
    [{ pxX: px.left - box.x, skip: px.left < box.x || px.left > box.x + box.w }, [255, 0, 0]],
    [{ pxX: px.right - box.x, skip: px.right < box.x || px.right > box.x + box.w }, [255, 0, 0]],
    [{ pxY: px.top - box.y, skip: px.top < box.y || px.top > box.y + box.h }, [255, 0, 0]],
    [{ pxY: px.bottom - box.y, skip: px.bottom < box.y || px.bottom > box.y + box.h }, [255, 0, 0]],
  ].filter(([value]) => !value.skip)
  const scaled = drawLines(region, local, scale)
  writePngRgba(resolve(here, `letter-debug-${name}.png`), scaled.width, scaled.height, scaled.rgba)
  return { box, out: { w: scaled.width, h: scaled.height } }
}

const debugs = {
  topRight: debugCrop('topright', 50, 100, 0, 45, 1.4),
  bottomRight: debugCrop('bottomright', 50, 100, 40, 100, 1.4),
  left: debugCrop('left', 0, 30, 0, 100, 1),
  bottom: debugCrop('bottom', 0, 75, 45, 100, 1.2),
}

// rpx 参考：四角按 1:1 渲染所需轨道尺寸
const rpxScale = CARD_WIDTH_RPX / outW
const rpx = {
  left: Math.round(px.left * rpxScale),
  right: Math.round((outW - px.right) * rpxScale),
  top: Math.round(px.top * rpxScale),
  bottom: Math.round((outH - px.bottom) * rpxScale),
  naturalHeight: Math.round(outH * rpxScale),
}

console.log(JSON.stringify({
  original: originalSize,
  archive: { width: image.width, height: image.height },
  contentBox,
  sheet: { width: outW, height: outH },
  slicePx: px,
  slicePct: SLICE,
  rpx,
  tiles: tileFiles,
  debugs,
}, null, 2))
