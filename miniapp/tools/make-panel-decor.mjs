// 生成三面板（任务/照片墙/衣柜）装饰素材：SVG 矢量绘制 → sharp 出件 PNG。
// 产出（PNG8 256 色全色板 + 抖动，与其他包内素材管线一致）：
//   1. cork-board-v1.png      软木板无缝拼贴（照片墙墙面，168×168 可平铺）
//   2. wood-board-v1.png      木纹无缝拼贴（任务看板木底/衣柜挂杆，192×128 可平铺）
//   3. photo-wall-empty-v1.png 照片墙空态插画（手绘贴纸风，风格对齐 make-item-icons.mjs）
// 种子固定，出件可复现；平铺无缝靠边缘 26px 内形状跨缝复制。
// 运行：node miniapp/tools/make-panel-decor.mjs
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const outDir = path.resolve(import.meta.dirname, '../src/assets/decor')
await mkdir(outDir, { recursive: true })

// —— 伪随机（mulberry32，种子固定保证可复现） ——
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20260901)
const between = (min, max) => min + rand() * (max - min)
const pick = (list) => list[Math.floor(rand() * list.length)]

// 平铺无缝：靠近边缘（26px 内）的形状在另一侧补一份
function tilePositions(x, y, w, h, margin = 26) {
  const xs = [x]
  if (x < margin) xs.push(x + w)
  if (x > w - margin) xs.push(x - w)
  const ys = [y]
  if (y < margin) ys.push(y + h)
  if (y > h - margin) ys.push(y - h)
  const out = []
  for (const xx of xs) for (const yy of ys) out.push([xx, yy])
  return out
}

// —— 1. 软木板：暖棕底 + 云斑 + 颗粒 + 木屑长条 ——
const CORK_W = 168
const CORK_H = 168
const cork = (() => {
  const granuleColors = ['#c49a6d', '#b58758', '#e9cda4', '#a9744d', '#f0dcbf', '#8f5f3c']
  const granules = []
  for (let i = 0; i < 300; i++) {
    const [x, y] = [between(0, CORK_W), between(0, CORK_H)]
    const rx = between(.8, 2.6)
    const ry = rx * between(.6, 1.1)
    const rot = between(0, 180).toFixed(0)
    for (const [px, py] of tilePositions(x, y, CORK_W, CORK_H)) {
      granules.push(`<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" transform="rotate(${rot} ${px.toFixed(1)} ${py.toFixed(1)})" fill="${pick(granuleColors)}" opacity="${between(.4, .85).toFixed(2)}"/>`)
    }
  }
  const slivers = []
  for (let i = 0; i < 26; i++) {
    const [x, y] = [between(0, CORK_W), between(0, CORK_H)]
    const len = between(7, 18)
    const th = between(1.2, 2.4)
    const rot = between(-30, 30).toFixed(0)
    for (const [px, py] of tilePositions(x, y, CORK_W, CORK_H)) {
      slivers.push(`<rect x="${(px - len / 2).toFixed(1)}" y="${(py - th / 2).toFixed(1)}" width="${len.toFixed(1)}" height="${th.toFixed(1)}" rx="${(th / 2).toFixed(1)}" transform="rotate(${rot} ${px.toFixed(1)} ${py.toFixed(1)})" fill="${pick(['#b9835a', '#a9744d', '#c79a6d'])}" opacity="${between(.3, .5).toFixed(2)}"/>`)
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CORK_W}" height="${CORK_H}" viewBox="0 0 ${CORK_W} ${CORK_H}">
  <rect width="${CORK_W}" height="${CORK_H}" fill="#dcb287"/>
  ${slivers.join('')}
  ${granules.join('')}
</svg>`
})()

// —— 2. 木纹：暖棕底 + 横向波浪纹 + 浅色高光条 + 小木节 ——
const WOOD_W = 192
const WOOD_H = 128
const wood = (() => {
  const grains = []
  for (let i = 0; i < 20; i++) {
    const y = between(-6, WOOD_H + 6)
    const amp = between(1.5, 4.5)
    const period = between(90, 170)
    const phase = between(0, Math.PI * 2)
    const d = ['M -12', y.toFixed(1)]
    for (let x = 0; x <= WOOD_W + 12; x += 12) {
      const yy = y + Math.sin(phase + (x / period) * Math.PI * 2) * amp
      d.push(`S ${(x - 4).toFixed(0)} ${yy.toFixed(1)} ${x} ${yy.toFixed(1)}`)
    }
    for (const dy of [0, WOOD_H]) {
      grains.push(`<path d="${d.join(' ')}" transform="translate(0 ${dy})" fill="none" stroke="${pick(['#c08a52', '#a97844', '#b5854e'])}" stroke-width="${between(.8, 2).toFixed(1)}" opacity="${between(.28, .55).toFixed(2)}" stroke-linecap="round"/>`)
    }
  }
  const streaks = []
  for (let i = 0; i < 9; i++) {
    const y = between(4, WOOD_H - 4)
    const len = between(40, 110)
    const x = between(-10, WOOD_W - len + 10)
    for (const dx of [0, WOOD_W]) {
      streaks.push(`<rect x="${(x + dx).toFixed(1)}" y="${(y - between(1, 2.4)).toFixed(1)}" width="${len.toFixed(1)}" height="${between(2, 5).toFixed(1)}" rx="2" fill="#eec79a" opacity="${between(.25, .45).toFixed(2)}"/>`)
    }
  }
  const knots = []
  for (const [kx, ky] of [[WOOD_W * .32, WOOD_H * .38], [WOOD_W * .74, WOOD_H * .66]]) {
    knots.push(`<g><ellipse cx="${kx}" cy="${ky}" rx="9" ry="5.6" fill="none" stroke="#a97844" stroke-width="2.4" opacity=".5"/>
    <ellipse cx="${kx}" cy="${ky}" rx="4.6" ry="2.8" fill="none" stroke="#9c6f42" stroke-width="2.2" opacity=".55"/>
    <ellipse cx="${kx}" cy="${ky}" rx="1.6" ry="1" fill="#8f5f3c" opacity=".5"/></g>`)
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WOOD_W}" height="${WOOD_H}" viewBox="0 0 ${WOOD_W} ${WOOD_H}">
  <rect width="${WOOD_W}" height="${WOOD_H}" fill="#dcaa74"/>
  ${grains.join('')}
  ${streaks.join('')}
  ${knots.join('')}
</svg>`
})()

// —— 3. 照片墙空态插画：两张叠放拍立得 + 图钉 + 爪印 + 星星（手绘贴纸风） ——
const STROKE = '#3a2417'
const CREAM = '#fcfcf7'
const BROWN = '#c98a4b'
const RED = '#e25c4a'
const BLUE = '#a8cdeb'
const ORANGE_DEEP = '#d08b4b'
const photoWallEmpty = (() => {
  const paw = (fill, stroke, sw) => `
    <ellipse cx="0" cy="10" rx="15" ry="11.5" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
    <ellipse cx="-13" cy="-4" rx="5.6" ry="6.6" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
    <ellipse cx="-4.5" cy="-11" rx="5.4" ry="6.6" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
    <ellipse cx="5.5" cy="-10.5" rx="5.2" ry="6.4" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
    <ellipse cx="13.5" cy="-3.5" rx="5.2" ry="6.2" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
  const heart = (fill) => `<path d="M 0 6 C -7 -2 -16 2 -16 9 C -16 17 -6 23 0 27 C 6 23 16 17 16 9 C 16 2 7 -2 0 6 Z" fill="${fill}" stroke="${STROKE}" stroke-width="7" stroke-linejoin="round"/>`
  const spark = (x, y, s = 1) => `<path d="M ${x} ${y - 9 * s} L ${x} ${y + 9 * s} M ${x - 9 * s} ${y} L ${x + 9 * s} ${y}" stroke="${ORANGE_DEEP}" stroke-width="7" stroke-linecap="round" fill="none" opacity=".85"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="280" viewBox="0 0 340 280">
  <!-- 背面拍立得（左倾） -->
  <g transform="translate(126 128) rotate(-9)">
    <rect x="-76" y="-88" width="152" height="176" rx="8" fill="${CREAM}" stroke="${STROKE}" stroke-width="9"/>
    <rect x="-58" y="-70" width="116" height="104" rx="4" fill="${BLUE}"/>
    <path d="M -58 18 Q -20 -12 0 6 Q 30 28 58 6 L 58 34 L -58 34 Z" fill="#9fd6a8" stroke="none"/>
    <g transform="translate(0 -22) scale(.72)">${paw(CREAM, 'none', 0)}</g>
  </g>
  <!-- 正面拍立得（右倾）+ 爪印与爱心 -->
  <g transform="translate(196 146) rotate(4)">
    <rect x="-86" y="-98" width="172" height="196" rx="9" fill="${CREAM}" stroke="${STROKE}" stroke-width="10"/>
    <rect x="-66" y="-78" width="132" height="118" rx="5" fill="#fff3df" stroke="${STROKE}" stroke-width="5"/>
    <g transform="translate(-18 -14) scale(1.05)">${paw(BROWN, STROKE, 7)}</g>
    <g transform="translate(38 22) scale(.8)">${heart(RED)}</g>
    <path d="M -20 62 q 12 -9 26 -2" stroke="#fff" stroke-width="8" stroke-linecap="round" fill="none" opacity=".9"/>
  </g>
  <!-- 红色图钉（正面拍立得顶部） -->
  <g transform="translate(196 44)">
    <ellipse cx="2" cy="7" rx="11" ry="8" fill="#8f5f3c" opacity=".35"/>
    <circle cx="0" cy="0" r="12" fill="${RED}" stroke="${STROKE}" stroke-width="7"/>
    <circle cx="-4" cy="-4" r="3.4" fill="#fff" opacity=".85"/>
  </g>
  ${spark(58, 58)}
  ${spark(288, 70, .8)}
  ${spark(302, 208, .7)}
  ${spark(42, 208, .65)}
</svg>`
})()

// 出件：PNG8（256 色全色板 + 误差扩散抖动），与 optimize-miniapp-assets.mjs 编码参数一致
async function emit(name, svg) {
  const target = path.join(outDir, name)
  const out = await sharp(Buffer.from(svg)).png({ palette: true, quality: 100, colors: 256, effort: 10, dither: 1 }).toBuffer()
  await writeFile(target, out)
  console.log(name, `${(out.length / 1024).toFixed(1)}K`)
}

await emit('cork-board-v1.png', cork)
await emit('wood-board-v1.png', wood)
await emit('photo-wall-empty-v1.png', photoWallEmpty)

// 预览拼图：软木 2×2（检查接缝）+ 木纹 2×2 + 插画叠放观感（仅本地预览，不打包）
const corkTile = await sharp(path.join(outDir, 'cork-board-v1.png')).toBuffer()
const woodTile = await sharp(path.join(outDir, 'wood-board-v1.png')).toBuffer()
const emptyPng = await sharp(path.join(outDir, 'photo-wall-empty-v1.png')).toBuffer()
const cork2x2 = await sharp({ create: { width: CORK_W * 2, height: CORK_H * 2, channels: 4, background: '#fff' } })
  .composite([
    { input: corkTile, left: 0, top: 0 }, { input: corkTile, left: CORK_W, top: 0 },
    { input: corkTile, left: 0, top: CORK_H }, { input: corkTile, left: CORK_W, top: CORK_H },
  ]).png().toBuffer()
const wood2x2 = await sharp({ create: { width: WOOD_W * 2, height: WOOD_H * 2, channels: 4, background: '#fff' } })
  .composite([
    { input: woodTile, left: 0, top: 0 }, { input: woodTile, left: WOOD_W, top: 0 },
    { input: woodTile, left: 0, top: WOOD_H }, { input: woodTile, left: WOOD_W, top: WOOD_H },
  ]).png().toBuffer()
const emptyOnCork = await sharp(cork2x2).resize(336, 224, { fit: 'cover' }).png().toBuffer()
const emptyOver = await sharp(emptyOnCork).composite([{ input: await sharp(wood2x2).resize(336, 112, { fit: 'cover' }).png().toBuffer(), left: 0, top: 224 }]).png().toBuffer()
await sharp({ create: { width: 720, height: 360, channels: 4, background: '#ffffff' } })
  .composite([
    { input: await sharp(cork2x2).resize(352, 352, { fit: 'contain', background: '#fff' }).png().toBuffer(), left: 0, top: 4 },
    { input: await sharp(wood2x2).resize(352, 235, { fit: 'contain', background: '#fff' }).png().toBuffer(), left: 362, top: 4 },
    { input: emptyPng, left: 60, top: 30 },
  ])
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(path.resolve(import.meta.dirname, 'tmp-panel-decor-preview.jpg'))
console.log('preview -> miniapp/tools/tmp-panel-decor-preview.jpg')
