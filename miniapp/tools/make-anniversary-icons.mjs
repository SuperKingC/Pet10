// 重新生成纪念日图标：SVG 矢量绘制 → sharp 出件 256×256 PNG。
// 风格：手绘贴纸风，对齐应用内心情/动作图标语言——深棕粗描边 + 奶白填充 +
// 柔和点缀色 + 小星星装饰，透明底（无边框、无底座）。
// 运行：node miniapp/tools/make-anniversary-icons.mjs
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const outDir = path.resolve(import.meta.dirname, '../src/assets/anniversaries')
await mkdir(outDir, { recursive: true })

// 采样自 mood-3-v2.png 的实测色板
const STROKE = '#3a2417' // 深棕描边
const CREAM = '#fcfcf7' // 奶白填充
const CREAM_WARM = '#f7e0bf' // 暖奶油（蛋糕胚/阴影面）
const ORANGE = '#e8a35c' // 暖橙点缀
const ORANGE_DEEP = '#d08b4b' // 深一档暖橙
const ROSE = '#f2b3a0' // 柔粉点缀
const BLUE = '#a8cdeb' // 柔蓝点缀（对应玩耍糖果）

const defs = `
<defs>
  <style>
    .s { stroke: ${STROKE}; stroke-width: 11; stroke-linecap: round; stroke-linejoin: round; fill: ${CREAM}; }
    .si { stroke: ${STROKE}; stroke-width: 8; stroke-linecap: round; stroke-linejoin: round; }
    .spark { stroke: ${ORANGE_DEEP}; stroke-width: 7; stroke-linecap: round; fill: none; }
    .hi { stroke: #ffffff; stroke-width: 9; stroke-linecap: round; fill: none; opacity: .9; }
  </style>
</defs>`

// 右上角小星星 + 左下小弧线：应用图标通用装饰
const decor = `
  <path class="spark" d="M198 52 l0 22 M187 63 l22 0"/>
  <path class="spark" d="M216 84 l0 13 M209.5 90.5 l13 0" opacity=".7"/>
  <path class="spark" d="M48 176 q 6 -10 18 -10" opacity=".7"/>`

const icons = {
  // 心形：奶白心 + 粉腮红两点 + 白高光弧
  heart: `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">${defs}
    <g transform="translate(0 10)">
      <path class="s" d="M128 192 C 98 170, 64 144, 64 106 C 64 80, 84 64, 106 64 C 117 64, 125 70, 128 78 C 131 70, 139 64, 150 64 C 172 64, 192 80, 192 106 C 192 144, 158 170, 128 192 Z"/>
      <ellipse cx="100" cy="108" rx="9" ry="6" fill="${ROSE}" opacity=".85"/>
      <ellipse cx="156" cy="108" rx="9" ry="6" fill="${ROSE}" opacity=".85"/>
      <path class="hi" d="M88 92 q 6 -12 20 -14"/>
    </g>${decor}</svg>`,
  // 星星：圆润五角星奶白填充 + 橙色芯
  star: `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">${defs}
    <g transform="translate(0 8)">
      <path class="s" d="M128 56 L 149 103 L 200 109 L 162 144 L 172 194 L 128 169 L 84 194 L 94 144 L 56 109 L 107 103 Z"/>
      <path class="si" style="fill: ${ORANGE};" d="M128 96 L 138 118 L 161 121 L 144 137 L 148 160 L 128 148 L 108 160 L 112 137 L 95 121 L 118 118 Z" stroke-width="6"/>
      <path class="hi" d="M92 92 q 8 -14 24 -16"/>
    </g>${decor}</svg>`,
  // 蛋糕：奶白淋面蛋糕 + 三根蜡烛 + 橙色火苗
  cake: `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">${defs}
    <g transform="translate(0 6)">
      <path class="s" d="M70 196 L 70 150 Q 70 140 80 140 L 176 140 Q 186 140 186 150 L 186 196 Q 186 204 178 204 L 78 204 Q 70 204 70 196 Z"/>
      <path class="si" d="M70 158 q 14 12 29 0 q 14 12 29 0 q 14 12 29 0 q 14 12 29 0" fill="none" stroke-width="7"/>
      <path class="si" d="M112 140 L 112 116 M 144 140 L 144 116" fill="none" stroke-width="9"/>
      <rect x="106" y="112" width="12" height="30" rx="6" style="fill: ${BLUE};" stroke="${STROKE}" stroke-width="7"/>
      <rect x="138" y="112" width="12" height="30" rx="6" style="fill: ${BLUE};" stroke="${STROKE}" stroke-width="7"/>
      <path class="si" d="M112 100 q 0 -10 0 -12 M 144 100 q 0 -10 0 -12" fill="none" stroke-width="7" opacity="0"/>
      <ellipse cx="112" cy="94" rx="7" ry="10" fill="${ORANGE}" stroke="${STROKE}" stroke-width="6"/>
      <ellipse cx="144" cy="94" rx="7" ry="10" fill="${ORANGE}" stroke="${STROKE}" stroke-width="6"/>
      <path class="hi" d="M84 176 q 4 -8 14 -9"/>
    </g>${decor}</svg>`,
  // 爪印：大肉垫 + 三趾，暖橙点缀趾垫
  paw: `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">${defs}
    <g transform="translate(0 8)">
      <ellipse class="s" cx="128" cy="158" rx="46" ry="38"/>
      <ellipse class="s" cx="84" cy="104" rx="17" ry="21" transform="rotate(-18 84 104)"/>
      <ellipse class="s" cx="128" cy="88" rx="17" ry="22"/>
      <ellipse class="s" cx="172" cy="104" rx="17" ry="21" transform="rotate(18 172 104)"/>
      <ellipse cx="112" cy="152" rx="10" ry="7" fill="${ROSE}" opacity=".85"/>
      <path class="hi" d="M104 142 q 6 -9 17 -10"/>
    </g>${decor}</svg>`,
  // 气球：圆润气球 + 三角结 + 波浪绳，柔粉填充
  balloon: `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">${defs}
    <g transform="translate(0 6)">
      <path class="si" d="M128 176 C 118 190, 140 198, 128 214" fill="none" stroke-width="8"/>
      <path class="s" style="fill: ${ROSE};" d="M128 44 C 162 44, 186 70, 186 102 C 186 132, 160 156, 128 156 C 96 156, 70 132, 70 102 C 70 70, 94 44, 128 44 Z"/>
      <path class="si" style="fill: ${ROSE};" d="M118 156 L 138 156 L 128 170 Z"/>
      <path class="hi" d="M96 78 q 8 -14 24 -16"/>
    </g>${decor}</svg>`,
}

for (const [name, svg] of Object.entries(icons)) {
  const png = await sharp(Buffer.from(svg)).png().toBuffer()
  const out = path.join(outDir, `anniv-${name}.png`)
  await writeFile(out, png)
  const meta = await sharp(out).metadata()
  process.stdout.write(`${out} ${meta.width}x${meta.height} ${png.length}\n`)
}
