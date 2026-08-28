// 一次性预览：眨眼方案对比 V1 瞳孔压扁 / V2 眼睑半透明 / V3 两者叠加。用后即删。
import { readFileSync, writeFileSync } from 'node:fs'
import { inflateSync, deflateSync } from 'node:zlib'

function readPng(p) {
  const buf = readFileSync(p)
  let pos = 8
  let w = 0
  let h = 0
  let ct = 0
  const idat = []
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos)
    const type = buf.toString('ascii', pos + 4, pos + 8)
    const data = buf.subarray(pos + 8, pos + 8 + len)
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9] }
    else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    pos += 12 + len
  }
  const raw = inflateSync(Buffer.concat(idat))
  const ch = ct === 6 ? 4 : 3
  const stride = w * ch
  const rgba = Buffer.alloc(w * h * 4)
  let prev = Buffer.alloc(stride)
  for (let y = 0; y < h; y += 1) {
    const f = raw[y * (stride + 1)]
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    const cur = Buffer.alloc(stride)
    for (let i = 0; i < stride; i += 1) {
      const a = i >= ch ? cur[i - ch] : 0
      const b = prev[i]
      const c = i >= ch ? prev[i - ch] : 0
      let v = line[i]
      if (f === 1) v += a
      else if (f === 2) v += b
      else if (f === 3) v += (a + b) >> 1
      else if (f === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      cur[i] = v & 0xff
    }
    for (let x = 0; x < w; x += 1) {
      const si = x * ch
      const di = (y * w + x) * 4
      rgba[di] = cur[si]
      rgba[di + 1] = cur[si + 1]
      rgba[di + 2] = cur[si + 2]
      rgba[di + 3] = ch === 4 ? cur[si + 3] : 255
    }
    prev = cur
  }
  return { w, h, rgba }
}

const crcT = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n += 1) { let c = n; for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c } return t })()
const crc32 = (b) => { let c = -1; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0 }
const chunk = (t, d) => { const o = Buffer.alloc(12 + d.length); o.writeUInt32BE(d.length, 0); o.write(t, 4, 'ascii'); d.copy(o, 8); o.writeUInt32BE(crc32(o.subarray(4, 8 + d.length)), 8 + d.length); return o }
function writePng(p, w, h, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6
  const stride = w * 4
  const raw = Buffer.alloc((stride + 1) * h)
  for (let y = 0; y < h; y += 1) { raw[y * (stride + 1)] = 0; rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride) }
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
  writeFileSync(p, png)
}

const dir = 'src/assets/nest/'
const body = readPng(dir + 'xiaoduoli-body.png')
const eyes = readPng(dir + 'xiaoduoli-eyes.png')
const pupils = readPng(dir + 'xiaoduoli-pupils.png')
const lids = readPng(dir + 'xiaoduoli-lids.png')
const { w, h } = body
const CENTERS = [[159, 179], [292, 171]]

// 瞳孔压扁：y' = cy + (y-cy)*scale
const squashPupils = (scale) => {
  const out = Buffer.alloc(w * h * 4)
  for (const [cx, cy] of CENTERS) {
    for (let dy = -18; dy <= 18; dy += 1) {
      for (let dx = -18; dx <= 18; dx += 1) {
        const sy = cy + dy
        const sySrc = Math.round(cy + (dy / scale))
        if (sySrc < 0 || sySrc >= h) continue
        const si = (sySrc * w + (cx + dx)) * 4
        const a = pupils.rgba[si + 3]
        if (a === 0) continue
        const di = (sy * w + (cx + dx)) * 4
        out[di] = pupils.rgba[si]
        out[di + 1] = pupils.rgba[si + 1]
        out[di + 2] = pupils.rgba[si + 2]
        out[di + 3] = a
      }
    }
  }
  return { w, h, rgba: out }
}

const compose = (layers) => {
  const out = Buffer.from(body.rgba)
  for (const l of layers) {
    for (let i = 0; i < out.length; i += 4) {
      const sa = (l.img.rgba[i + 3] / 255) * (l.alpha ?? 1)
      if (sa <= 0) continue
      out[i] = Math.round(out[i] * (1 - sa) + l.img.rgba[i] * sa)
      out[i + 1] = Math.round(out[i + 1] * (1 - sa) + l.img.rgba[i + 1] * sa)
      out[i + 2] = Math.round(out[i + 2] * (1 - sa) + l.img.rgba[i + 2] * sa)
    }
  }
  return out
}

const base = [{ img: eyes }, { img: pupils }]
const v1 = compose([...base, { img: squashPupils(0.1) }])
const v2 = compose([{ img: eyes }, { img: lids, alpha: 0.55 }])
const v3 = compose([{ img: eyes }, { img: lids, alpha: 0.55 }, { img: squashPupils(0.1) }])

const W = w * 3 + 20
const H = h + 10
const canvas = Buffer.alloc(W * H * 4)
;[v1, v2, v3].forEach((data, idx) => {
  const ox = idx * (w + 10)
  for (let y = 0; y < h; y += 1) data.copy(canvas, (y * W + ox) * 4, y * w * 4, (y + 1) * w * 4)
})
writePng('tools/tmp-blink-preview.png', W, H, canvas)
console.log('blink preview written')
