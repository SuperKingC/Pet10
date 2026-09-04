// 一次性出件：design-assets/nest/xiaoduoli-box-worn-raw.png（白底 2K 生图）
// → miniapp/src/assets/nest/xiaoduoli-box-v2.png（透明底 PNG8，≤180KB 安全线）
// 抠法：从四边泛洪填充近白背景（容差防白噪点残留），边缘 1px 渐隐去白晕；
// 再按显示尺寸重采样（stage 高 406rpx，箱高 35.5% ≈ 144rpx ≈ 288 物理px，2x 留清晰度取 560 宽档）。
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const SRC = path.join(ROOT, 'design-assets/nest/xiaoduoli-box-worn-raw.png')
const OUT = path.join(ROOT, 'miniapp/src/assets/nest/xiaoduoli-box-v2.png')
const TARGET_WIDTH = 560

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width, height, channels } = info
const pixels = new Uint8ClampedArray(data)

const idx = (x, y) => (y * width + x) * channels
const isNearWhite = (i) => {
  const [r, g, b, a] = [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]]
  if (a === 0) return true
  // 近白且低饱和才当背景；牛皮纸高饱和黄色系不会被误杀
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  return r > 238 && g > 238 && b > 235 && max - min < 18
}

// 种子泛洪：只清与画布四边连通的白色区域，箱体内暗部/浅色高光不受影响
const visited = new Uint8Array(width * height)
const stack = []
for (let x = 0; x < width; x += 1) {
  stack.push([x, 0], [x, height - 1])
}
for (let y = 0; y < height; y += 1) {
  stack.push([0, y], [width - 1, y])
}
while (stack.length) {
  const [x, y] = stack.pop()
  if (x < 0 || y < 0 || x >= width || y >= height) continue
  const flat = y * width + x
  if (visited[flat]) continue
  const i = flat * channels
  if (!isNearWhite(i)) continue
  visited[flat] = 1
  pixels[i + 3] = 0
  stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
}

// 边缘 1px 半透明渐隐：邻接透明区的不透明像素降 alpha，消除白底描边感
const alphaSnapshot = new Uint8ClampedArray(width * height)
for (let flat = 0; flat < width * height; flat += 1) alphaSnapshot[flat] = pixels[flat * channels + 3]
for (let y = 1; y < height - 1; y += 1) {
  for (let x = 1; x < width - 1; x += 1) {
    const flat = y * width + x
    if (alphaSnapshot[flat] === 0) continue
    const neighbors = [flat - 1, flat + 1, flat - width, flat + width]
    if (neighborsHasTransparent(neighbors, alphaSnapshot)) pixels[flat * channels + 3] = Math.min(alphaSnapshot[flat], 140)
  }
}
function neighborsHasTransparent(neighbors, snapshot) {
  return neighbors.some((flat) => snapshot[flat] === 0)
}

await sharp(pixels, { raw: { width, height, channels } })
  .resize({ width: TARGET_WIDTH, height: Math.round((TARGET_WIDTH * height) / width), fit: 'fill' })
  .png({ palette: true, quality: 100, colors: 256, effort: 10, dither: 1 })
  .toFile(OUT)

const meta = await sharp(OUT).metadata()
console.log(`ok ${OUT} ${meta.width}x${meta.height}`)
