// 生成微信小程序头像（icon）：xiaoduoli.png 头胸特写 + 暖色渐变底 + 品牌风小装饰。
// 出两个配色变体（奶油底 / 琥珀底），各出 1024 正式图与 144 预览图。
// 运行：node miniapp/tools/make-appicon.mjs
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const outDir = path.resolve(import.meta.dirname, './appicon-preview')
await mkdir(outDir, { recursive: true })

const SRC = path.resolve(import.meta.dirname, '../src/assets/xiaoduoli.png')
const SIZE = 1024

// 头胸特写裁窗：保留头顶到胸口绒毛，切在腿前，脸部占比更大更耐缩小。
const CROP = { left: 0, top: 0, width: 436, height: 470 }
const DOG_H = 900 // 狗在小图中的高（底部越出画布，避免胸口出现平切硬边）

const dogBuf = await sharp(SRC).extract(CROP).resize({ height: DOG_H }).png().toBuffer()
const dogMeta = await sharp(dogBuf).metadata()
const dogW = dogMeta.width
const dogX = Math.round((SIZE - dogW) / 2)
const dogY = 150

const variants = {
  // 奶油底：贴近应用内 #fff8ee 的温吞奶油色
  cream: {
    bgA: '#fff7e4',
    bgB: '#ffdfae',
    halo: '#ffffff',
    haloOpacity: 0.62,
    ink: '#8a5a33',
  },
  // 琥珀底：更深的暖橘，浅毛小狗对比更强，列表小图里更跳
  amber: {
    bgA: '#ffdf9e',
    bgB: '#ffab5e',
    halo: '#fff8ec',
    haloOpacity: 0.75,
    ink: '#9c5f2c',
  },
}

const deco = (ink) => `
  <g stroke="${ink}" stroke-width="12" stroke-linecap="round" fill="none" opacity=".55">
    <path d="M148 148 l0 40 M128 168 l40 0"/>
    <path d="M884 176 l0 28 M870 190 l28 0" opacity=".8"/>
  </g>`

function sceneSvg(v) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <radialGradient id="bg" cx="46%" cy="34%" r="88%">
      <stop offset="0%" stop-color="${v.bgA}"/>
      <stop offset="100%" stop-color="${v.bgB}"/>
    </radialGradient>
    <radialGradient id="halo" cx="50%" cy="44%" r="62%">
      <stop offset="0%" stop-color="${v.halo}" stop-opacity="${v.haloOpacity}"/>
      <stop offset="70%" stop-color="${v.halo}" stop-opacity="${v.haloOpacity * 0.85}"/>
      <stop offset="100%" stop-color="${v.halo}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#halo)"/>
  ${deco(v.ink)}
</svg>`
}

for (const [name, v] of Object.entries(variants)) {
  const bg = Buffer.from(sceneSvg(v))
  const full = await sharp(bg)
    .composite([{ input: dogBuf, left: dogX, top: dogY }])
    .png()
    .toBuffer()
  await sharp(full).toFile(path.join(outDir, `appicon-${name}-1024.png`))
  await sharp(full).resize(144, 144).png().toFile(path.join(outDir, `appicon-${name}-144.png`))
  console.log('done', name)
}
