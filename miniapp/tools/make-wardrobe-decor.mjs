// 衣柜面板装饰资源：衣柜内景背景（木板墙+挂杆+暖光）与迷你衣架
// 风格对齐纪念日/道具图标脚本：深棕描边 + 奶油/暖木色 + 柔和渐变，SVG 矢量绘制 → sharp 出件 PNG8。
// 运行：node miniapp/tools/make-wardrobe-decor.mjs
import { mkdir, writeFile } from 'node:fs/promises'
import { statSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const outDir = path.resolve(import.meta.dirname, '../src/assets/wardrobe')
await mkdir(outDir, { recursive: true })

const STROKE = '#3a2417'
const WOOD_LIGHT = '#e9c891'
const WOOD_MID = '#d9ae74'
const WOOD_DEEP = '#c69355'
const CREAM = '#fcfcf7'

// —— 1) 衣柜内景背景 750×520：竖木板墙 + 挂杆 + 中央暖光，底部渐隐到面板底色 ——
const W = 640, H = 444
const planks = []
for (let i = 0; i < 7; i++) {
  const x = i * (W / 7)
  const fill = i % 2 === 0 ? WOOD_LIGHT : WOOD_MID
  planks.push(`<rect x="${x + 3}" y="0" width="${W / 7 - 6}" height="${H - 90}" rx="10" fill="${fill}"/>`)
  planks.push(`<rect x="${x + 8}" y="0" width="12" height="${H - 90}" fill="#f6e2ba"/>`)
}
const interior = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="rail" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#cf9c5e"/>
      <stop offset="1" stop-color="#a3743f"/>
    </linearGradient>
  </defs>
  ${planks.join('')}
  <!-- 中央浅色背板（拍立得舞台背后） -->
  <rect x="150" y="170" width="450" height="260" rx="26" fill="#fdf0d9" stroke="#ecd3a8" stroke-width="6"/>
  <!-- 挂杆与托架 -->
  <rect x="18" y="96" width="${W - 36}" height="26" rx="13" fill="url(#rail)" stroke="${STROKE}" stroke-width="7"/>
  <rect x="86" y="86" width="26" height="46" rx="8" fill="${WOOD_DEEP}" stroke="${STROKE}" stroke-width="7"/>
  <rect x="${W - 112}" y="86" width="26" height="46" rx="8" fill="${WOOD_DEEP}" stroke="${STROKE}" stroke-width="7"/>
  <!-- 底部木质踏板收边 -->
  <rect x="0" y="${H - 52}" width="${W}" height="34" fill="${WOOD_DEEP}"/>
  <rect x="0" y="${H - 58}" width="${W}" height="8" fill="#8a5a2b"/>
</svg>`

await writeFile(path.join(outDir, 'wardrobe-interior-v1.png'),
  await sharp(Buffer.from(interior)).png({ palette: true, colors: 96, compressionLevel: 9, dither: 0 }).toBuffer())

// —— 2) 迷你衣架 140×120：钩 + 斜肩横杆，贴纸风 ——
const hanger = `
<svg width="140" height="120" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="hbar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${CREAM}"/>
      <stop offset="1" stop-color="${WOOD_LIGHT}"/>
    </linearGradient>
  </defs>
  <!-- 挂钩 -->
  <path d="M70 44 C70 20 92 16 92 32 C92 42 82 44 78 48" fill="none" stroke="${STROKE}" stroke-width="11" stroke-linecap="round"/>
  <!-- 斜肩 -->
  <path d="M70 52 L18 92 Q10 100 22 104 L118 104 Q130 100 122 92 Z" fill="url(#hbar)" stroke="${STROKE}" stroke-width="10" stroke-linejoin="round"/>
  <!-- 横杆 -->
  <rect x="24" y="94" width="92" height="9" rx="4.5" fill="${WOOD_DEEP}" stroke="${STROKE}" stroke-width="6"/>
</svg>`

await writeFile(path.join(outDir, 'hanger-v1.png'),
  await sharp(Buffer.from(hanger)).png({ palette: true, colors: 64, compressionLevel: 9, dither: 0 }).toBuffer())

for (const f of ['wardrobe-interior-v1.png', 'hanger-v1.png']) {
  const meta = await sharp(path.join(outDir, f)).metadata()
  const bytes = statSync(path.join(outDir, f)).size
  console.log(`${f}: ${meta.width}x${meta.height} ${(bytes / 1024).toFixed(1)}KB`)
}
