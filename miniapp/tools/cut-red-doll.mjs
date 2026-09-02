// 白底 AI 源图 → 透明 PNG8 出件（边界泛洪去白底，保住米色口鼻爪尖），并列出 alpha bbox
// 用法：node miniapp/tools/cut-red-doll.mjs <source.png> <out.png> <displayWidth>
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'

const [, , srcArg, outArg, widthArg] = process.argv
const src = resolve(srcArg)
const out = resolve(outArg)
const displayWidth = Number(widthArg)

const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: W, height: H, channels: C } = info

// 1) 标记"近白"像素（高亮度低饱和）
const nearWhite = new Uint8Array(W * H)
for (let i = 0; i < W * H; i++) {
  const r = data[i * C], g = data[i * C + 1], b = data[i * C + 2]
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  if (min > 225 && max - min < 18) nearWhite[i] = 1
}
// 2) 从四边泛洪：只把与边缘连通的近白置为背景（内部米色不受影响）
const bg = new Uint8Array(W * H)
const stack = []
for (let x = 0; x < W; x++) { stack.push(x, (H - 1) * W + x) }
for (let y = 0; y < H; y++) { stack.push(y * W, y * W + W - 1) }
while (stack.length) {
  const p = stack.pop()
  if (p < 0 || p >= W * H || bg[p] || !nearWhite[p]) continue
  bg[p] = 1
  const x = p % W
  if (x > 0) stack.push(p - 1)
  if (x < W - 1) stack.push(p + 1)
  if (p >= W) stack.push(p - W)
  if (p < W * (H - 1)) stack.push(p + W)
}
// 3) 写 alpha（边缘 1.5px 渐变抗锯齿：按近白程度半透）
let minX = W, minY = H, maxX = -1, maxY = -1
const outBuf = Buffer.alloc(W * H * 4)
for (let i = 0; i < W * H; i++) {
  outBuf[i * 4] = data[i * C]
  outBuf[i * 4 + 1] = data[i * C + 1]
  outBuf[i * 4 + 2] = data[i * C + 2]
  if (bg[i]) outBuf[i * 4 + 3] = 0
  else {
    outBuf[i * 4 + 3] = 255
    const x = i % W, y = (i / W) | 0
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
}
const trimmed = await sharp(outBuf, { raw: { width: W, height: H, channels: 4 } })
  .extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
  .png()
  .toBuffer()
const tMeta = await sharp(trimmed).metadata()
const displayHeight = Math.round(displayWidth * tMeta.height / tMeta.width)
await sharp(trimmed).resize(displayWidth, displayHeight).png({ palette: true, colors: 64, compressionLevel: 9 }).toFile(out)
console.log(JSON.stringify({ src: srcArg, out: outArg, trim: { x: minX, y: minY, w: tMeta.width, h: tMeta.height }, display: { w: displayWidth, h: displayHeight } }))
