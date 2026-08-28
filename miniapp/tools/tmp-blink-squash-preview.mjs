// 一次性预览：压扁眨眼合成（张开/半合/闭合）+ 真实尺寸条 + 眼部放大。用后即删。
// 用法：node tools/tmp-blink-squash-preview.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { PNG } from 'pngjs'

const load = (n) => PNG.sync.read(readFileSync(`src/assets/nest/${n}`))
const body = load('xiaoduoli-body.png')
const eyes = load('xiaoduoli-eyes.png')
const pupils = load('xiaoduoli-pupils.png')
const under = load('xiaoduoli-underlay.png')
const { width: w, height: h } = body
const PIVOT = Math.round(0.5573 * h)
const wrap = (data) => ({ data })

const squash = (img, scale) => {
  const out = Buffer.alloc(w * h * 4)
  for (let y = 0; y < h; y += 1) {
    const sy = Math.round(PIVOT + (y - PIVOT) / scale)
    if (sy < 0 || sy >= h) continue
    for (let x = 0; x < w; x += 1) {
      const si = (sy * w + x) * 4
      const a = img.data[si + 3]
      if (a === 0) continue
      const di = (y * w + x) * 4
      out[di] = img.data[si]; out[di + 1] = img.data[si + 1]; out[di + 2] = img.data[si + 2]; out[di + 3] = a
    }
  }
  return out
}

const compose = (layers) => {
  const out = Buffer.from(body.data)
  for (const l of layers) {
    for (let i = 0; i < out.length; i += 4) {
      const sa = (l.img.data[i + 3] / 255) * (l.alpha ?? 1)
      if (sa <= 0) continue
      out[i] = Math.round(out[i] * (1 - sa) + l.img.data[i] * sa)
      out[i + 1] = Math.round(out[i + 1] * (1 - sa) + l.img.data[i + 1] * sa)
      out[i + 2] = Math.round(out[i + 2] * (1 - sa) + l.img.data[i + 2] * sa)
    }
  }
  return out
}

const frames = [
  compose([{ img: eyes }, { img: pupils }]),
  compose([{ img: under }, { img: wrap(squash(eyes, 0.55)) }, { img: wrap(squash(pupils, 0.55)) }]),
  compose([{ img: under }, { img: wrap(squash(eyes, 0.08)) }, { img: wrap(squash(pupils, 0.08)) }]),
]

// 2x 画布条
const Z = 2
const pad = 6
const W = (w * frames.length + pad * (frames.length - 1)) * Z
const H = (h + pad * 2) * Z
const canvas = Buffer.alloc(W * H * 4)
frames.forEach((data, fi) => {
  const ox = (fi * (w + pad) + pad) * Z
  const oy = pad * Z
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const si = (y * w + x) * 4
      const c = data[si + 3] === 0 ? [24, 20, 28, 255] : [data[si], data[si + 1], data[si + 2], 255]
      for (let yy = 0; yy < Z; yy += 1) {
        for (let xx = 0; xx < Z; xx += 1) {
          const di = ((oy + y * Z + yy) * W + ox + x * Z + xx) * 4
          canvas[di] = c[0]; canvas[di + 1] = c[1]; canvas[di + 2] = c[2]; canvas[di + 3] = 255
        }
      }
    }
  }
})
const png = new PNG({ width: W, height: H })
png.data = canvas
writeFileSync('tools/tmp-blink-fix-preview.png', PNG.sync.write(png))

// 真实尺寸条（96px 宽 puppet）
const DW = 96
const DH = Math.round((h * DW) / w)
const down = (d) => {
  const out = Buffer.alloc(DW * DH * 4)
  for (let y = 0; y < DH; y += 1) {
    for (let x = 0; x < DW; x += 1) {
      const sx = ((x + 0.5) * w) / DW
      const sy = ((y + 0.5) * h) / DH
      const x0 = Math.min(w - 1, Math.floor(sx)); const y0 = Math.min(h - 1, Math.floor(sy))
      const fx = sx - x0 - 0.5; const fy = sy - y0 - 0.5
      const x1 = Math.min(w - 1, x0 + 1); const y1 = Math.min(h - 1, y0 + 1)
      const acc = [0, 0, 0, 0]
      for (const [xx, yy, wt] of [[x0, y0, (1 - fx) * (1 - fy)], [x1, y0, fx * (1 - fy)], [x0, y1, (1 - fx) * fy], [x1, y1, fx * fy]]) {
        const i4 = (yy * w + xx) * 4
        const a = (d[i4 + 3] / 255) * wt
        acc[0] += d[i4] * a; acc[1] += d[i4 + 1] * a; acc[2] += d[i4 + 2] * a; acc[3] += a
      }
      const di = (y * DW + x) * 4
      if (acc[3] <= 0) { out[di] = 24; out[di + 1] = 20; out[di + 2] = 28; out[di + 3] = 255 } else {
        const k = acc[3]
        out[di] = Math.round(acc[0] / k); out[di + 1] = Math.round(acc[1] / k); out[di + 2] = Math.round(acc[2] / k); out[di + 3] = 255
      }
    }
  }
  return out
}
const small = frames.map(down)
const SW = (DW + 8) * frames.length + 8
const SH = DH + 16
const sc = Buffer.alloc(SW * SH * 4)
small.forEach((d, fi) => {
  const ox = fi * (DW + 8) + 8
  const oy = 8
  for (let y = 0; y < DH; y += 1) {
    for (let x = 0; x < DW; x += 1) {
      const si = (y * DW + x) * 4
      const di = ((oy + y) * SW + ox + x) * 4
      sc[di] = d[si]; sc[di + 1] = d[si + 1]; sc[di + 2] = d[si + 2]; sc[di + 3] = 255
    }
  }
})
const png2 = new PNG({ width: SW, height: SH })
png2.data = sc
writeFileSync('tools/tmp-blink-fix-realscale.png', PNG.sync.write(png2))

// 真实尺寸眼部放大（张开 vs 闭合，6x）
const crop = (data) => {
  const cx0 = 28; const cy0 = 16; const cw = 46; const ch = 30
  const out = Buffer.alloc(cw * ch * 4)
  for (let y = 0; y < ch; y += 1) {
    for (let x = 0; x < cw; x += 1) {
      const si = ((cy0 + y) * DW + (cx0 + x)) * 4
      const di = (y * cw + x) * 4
      out[di] = data[si]; out[di + 1] = data[si + 1]; out[di + 2] = data[si + 2]; out[di + 3] = 255
    }
  }
  return out
}
const ZC = 6
const crops = [crop(small[0]), crop(small[2])]
const WC = (46 * 2 + 4) * ZC
const HC = 30 * ZC
const cc = Buffer.alloc(WC * HC * 4)
crops.forEach((c, fi) => {
  const ox = fi * (46 + 4) * ZC
  for (let y = 0; y < 30; y += 1) {
    for (let x = 0; x < 46; x += 1) {
      const si = (y * 46 + x) * 4
      for (let yy = 0; yy < ZC; yy += 1) {
        for (let xx = 0; xx < ZC; xx += 1) {
          const di = ((y * ZC + yy) * WC + ox + x * ZC + xx) * 4
          cc[di] = c[si]; cc[di + 1] = c[si + 1]; cc[di + 2] = c[si + 2]; cc[di + 3] = 255
        }
      }
    }
  }
})
const png3 = new PNG({ width: WC, height: HC })
png3.data = cc
writeFileSync('tools/tmp-blink-eye-zoom.png', PNG.sync.write(png3))
console.log('blink squash previews written')
