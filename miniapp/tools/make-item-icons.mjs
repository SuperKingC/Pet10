// 重新生成任务道具图标：SVG 矢量绘制 → sharp 出件 256×256 PNG。
// 风格对齐纪念日图标（make-anniversary-icons.mjs）：手绘贴纸风——深棕粗描边 +
// 奶白/柔和点缀色填充 + 小星星装饰，透明底。
// 运行：node miniapp/tools/make-item-icons.mjs
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const outDir = path.resolve(import.meta.dirname, '../src/assets/items')
await mkdir(outDir, { recursive: true })

// 采样自 mood-3-v2.png 的实测色板（与纪念日脚本一致）
const STROKE = '#3a2417'
const CREAM = '#fcfcf7'
const BROWN = '#c98a4b' // 饼干/面包色
const BROWN_DEEP = '#a96f38'
const RED = '#e25c4a' // 皮球红
const BLUE = '#a8cdeb' // 柔蓝
const ROSE = '#f2b3a0'
const ORANGE_DEEP = '#d08b4b'

const defs = `
<defs>
  <style>
    .s { stroke: ${STROKE}; stroke-width: 11; stroke-linecap: round; stroke-linejoin: round; fill: ${CREAM}; }
    .si { stroke: ${STROKE}; stroke-width: 8; stroke-linecap: round; stroke-linejoin: round; }
    .spark { stroke: ${ORANGE_DEEP}; stroke-width: 7; stroke-linecap: round; fill: none; }
    .hi { stroke: #ffffff; stroke-width: 9; stroke-linecap: round; fill: none; opacity: .9; }
  </style>
</defs>`

const decor = `
  <path class="spark" d="M198 52 l0 22 M187 63 l22 0"/>
  <path class="spark" d="M216 84 l0 13 M209.5 90.5 l13 0" opacity=".7"/>
  <path class="spark" d="M48 176 q 6 -10 18 -10" opacity=".7"/>`

const icons = {
  // 狗粮：淡蓝食盆 + 三粒饼干色狗粮 + 一粒抛起
  dog_food: `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">${defs}
    <g transform="translate(0 6)">
      <ellipse cx="150" cy="66" rx="16" ry="14" class="s" style="fill: ${BROWN};"/>
      <ellipse class="s" cx="78" cy="106" rx="20" ry="16" style="fill: ${BROWN};"/>
      <ellipse class="s" cx="122" cy="96" rx="20" ry="16" style="fill: ${BROWN};"/>
      <ellipse class="s" cx="100" cy="70" rx="18" ry="15" style="fill: ${BROWN};"/>
      <path class="s" style="fill: ${BLUE};" d="M52 132 L 204 132 L 188 196 Q 186 208 172 208 L 84 208 Q 70 208 68 196 Z"/>
      <path class="si" d="M62 152 L 194 152" fill="none" stroke-width="7"/>
      <path class="hi" d="M84 176 q 4 -8 14 -9"/>
    </g>${decor}</svg>`,
  // 皮球：红白双色球 + 中缝 + 白高光
  ball: `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">${defs}
    <g transform="translate(0 8)">
      <circle class="s" style="fill: ${RED};" cx="128" cy="130" r="76"/>
      <path class="si" d="M56 106 Q 128 152 200 106" fill="none" stroke-width="9"/>
      <path class="si" d="M56 154 Q 128 108 200 154" fill="none" stroke-width="9"/>
      <path class="hi" d="M86 92 q 10 -16 28 -18"/>
    </g>${decor}</svg>`,
  // 香皂：柔粉圆角皂块 + 皂盒水线 + 两颗泡泡
  soap: `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">${defs}
    <g transform="translate(0 8)">
      <path class="s" style="fill: ${ROSE};" d="M76 108 L 180 108 Q 200 108 200 130 L 200 166 Q 200 188 178 188 L 78 188 Q 56 188 56 166 L 56 130 Q 56 108 76 108 Z"/>
      <path class="si" style="fill: ${CREAM};" d="M88 132 L 168 132 Q 180 132 180 144 Q 180 156 168 156 L 88 156 Q 76 156 76 144 Q 76 132 88 132 Z" stroke-width="7"/>
      <circle class="s" cx="196" cy="76" r="16" stroke-width="8"/>
      <circle class="s" cx="64" cy="66" r="11" stroke-width="7"/>
      <path class="hi" d="M92 170 q 8 -6 18 -6"/>
    </g>${decor}</svg>`,
}

for (const [name, svg] of Object.entries(icons)) {
  const png = await sharp(Buffer.from(svg)).png().toBuffer()
  const out = path.join(outDir, `item-${name}-v1.png`)
  await writeFile(out, png)
  const meta = await sharp(out).metadata()
  process.stdout.write(`${out} ${meta.width}x${meta.height} ${png.length} bytes\n`)
}
