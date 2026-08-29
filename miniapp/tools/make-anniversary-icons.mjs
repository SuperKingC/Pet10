// 重新生成纪念日图标：SVG 矢量绘制 → sharp 出件 256×256 PNG。
// 风格：暖色奶油底 + 珊瑚橙主色渐变 + 顶部高光 + 柔和落影，与小程序暖色调统一。
// 运行：node miniapp/tools/make-anniversary-icons.mjs
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const outDir = path.resolve(import.meta.dirname, '../src/assets/anniversaries')
await mkdir(outDir, { recursive: true })

// 公共画布：256×256，圆角方形底座（图标座实底 #fbf3e3 一致），内容居中。
const frame = (inner) => `
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="base" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fdf6e8"/>
      <stop offset="1" stop-color="#f6e7cf"/>
    </linearGradient>
    <linearGradient id="coral" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f79e6c"/>
      <stop offset="1" stop-color="#e2693c"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f7c873"/>
      <stop offset="1" stop-color="#eda145"/>
    </linearGradient>
    <linearGradient id="cream" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fffdf6"/>
      <stop offset="1" stop-color="#fdf0d8"/>
    </linearGradient>
    <linearGradient id="rose" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f9b3a0"/>
      <stop offset="1" stop-color="#ef8570"/>
    </linearGradient>
  </defs>
  <rect x="8" y="8" width="240" height="240" rx="58" fill="url(#base)"/>
  <rect x="8" y="8" width="240" height="240" rx="58" fill="none" stroke="#eddcbd" stroke-width="3"/>
  ${inner}
</svg>`

// 柔和落影滤镜：内容統一向下偏移的半透明棕影
const shadow = (shape, dx = 0, dy = 7, blur = 6, opacity = 0.16) => `
<g filter="url(#soft)" opacity="${opacity}" transform="translate(${dx} ${dy})">${shape}</g>`

const defsFilter = `
<filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
  <feGaussianBlur stdDeviation="${'${BLUR}'}"/>
</filter>`

const icons = {
  // 心形：饱满双圆+尖底，左上高光
  heart: frame(`
    ${defsFilter}
    <g>
      ${shadow(`<path d="M128 196 C 96 172, 62 146, 62 108 C 62 82, 82 66, 104 66 C 116 66, 124 72, 128 80 C 132 72, 140 66, 152 66 C 174 66, 194 82, 194 108 C 194 146, 160 172, 128 196 Z" fill="url(#coral)"/>`)}
      <path d="M128 196 C 96 172, 62 146, 62 108 C 62 82, 82 66, 104 66 C 116 66, 124 72, 128 80 C 132 72, 140 66, 152 66 C 174 66, 194 82, 194 108 C 194 146, 160 172, 128 196 Z" fill="url(#coral)"/>
      <ellipse cx="96" cy="98" rx="16" ry="11" fill="#ffffff" opacity="0.55" transform="rotate(-24 96 98)"/>
    </g>
  `),
  // 星星：圆角五角星，中心小高光
  star: frame(`
    ${defsFilter}
    <g>
      ${shadow(`<path d="M128 58 L 148.6 104.6 L 199.3 110.4 L 161.7 145.1 L 171.3 195.4 L 128 170.6 L 84.7 195.4 L 94.3 145.1 L 56.7 110.4 L 107.4 104.6 Z" fill="url(#gold)" stroke="#d98a2f" stroke-width="0" />`)}
      <path d="M128 58 L 148.6 104.6 L 199.3 110.4 L 161.7 145.1 L 171.3 195.4 L 128 170.6 L 84.7 195.4 L 94.3 145.1 L 56.7 110.4 L 107.4 104.6 Z" fill="url(#gold)"/>
      <ellipse cx="112" cy="102" rx="13" ry="9" fill="#ffffff" opacity="0.6" transform="rotate(-28 112 102)"/>
    </g>
  `),
  // 蛋糕：双层奶油蛋糕+樱桃，暖色
  cake: frame(`
    ${defsFilter}
    <g>
      ${shadow(`<g>
        <rect x="66" y="150" width="124" height="52" rx="14" fill="url(#rose)"/>
        <rect x="58" y="128" width="140" height="34" rx="15" fill="url(#cream)" stroke="#eed4a8" stroke-width="2"/>
        <path d="M58 143 q 17.5 14 35 0 q 17.5 14 35 0 q 17.5 14 35 0 q 17.5 14 35 0 v 8 a 15 15 0 0 1 -15 15 h -110 a 15 15 0 0 1 -15 -15 Z" fill="#fffdf6"/>
        <rect x="120" y="96" width="16" height="34" rx="8" fill="#8fc7e8"/>
        <ellipse cx="128" cy="90" rx="11" ry="10" fill="#e4574f"/>
        <circle cx="124.5" cy="86.5" r="3.5" fill="#ffffff" opacity="0.7"/>
      </g>`)}
      <g>
        <rect x="66" y="150" width="124" height="52" rx="14" fill="url(#rose)"/>
        <rect x="58" y="128" width="140" height="34" rx="15" fill="url(#cream)" stroke="#eed4a8" stroke-width="2"/>
        <path d="M58 143 q 17.5 14 35 0 q 17.5 14 35 0 q 17.5 14 35 0 q 17.5 14 35 0 v 8 a 15 15 0 0 1 -15 15 h -110 a 15 15 0 0 1 -15 -15 Z" fill="#fffdf6"/>
        <rect x="120" y="96" width="16" height="34" rx="8" fill="#8fc7e8"/>
        <ellipse cx="128" cy="90" rx="11" ry="10" fill="#e4574f"/>
        <circle cx="124.5" cy="86.5" r="3.5" fill="#ffffff" opacity="0.7"/>
      </g>
    </g>
  `),
  // 爪印：大肉垫+四趾，暖棕珊瑚
  paw: frame(`
    ${defsFilter}
    <g>
      ${shadow(`<g fill="url(#coral)">
        <ellipse cx="128" cy="156" rx="46" ry="38"/>
        <ellipse cx="80" cy="106" rx="17" ry="21" transform="rotate(-18 80 106)"/>
        <ellipse cx="112" cy="86" rx="16" ry="22"/>
        <ellipse cx="144" cy="86" rx="16" ry="22"/>
        <ellipse cx="176" cy="106" rx="17" ry="21" transform="rotate(18 176 106)"/>
      </g>`)}
      <g fill="url(#coral)">
        <ellipse cx="128" cy="156" rx="46" ry="38"/>
        <ellipse cx="80" cy="106" rx="17" ry="21" transform="rotate(-18 80 106)"/>
        <ellipse cx="112" cy="86" rx="16" ry="22"/>
        <ellipse cx="144" cy="86" rx="16" ry="22"/>
        <ellipse cx="176" cy="106" rx="17" ry="21" transform="rotate(18 176 106)"/>
      </g>
      <ellipse cx="114" cy="146" rx="15" ry="9" fill="#ffffff" opacity="0.4" transform="rotate(-20 114 146)"/>
    </g>
  `),
  // 气球：圆润气球+高光+系绳
  balloon: frame(`
    ${defsFilter}
    <g>
      ${shadow(`<g>
        <path d="M128 52 C 160 52, 182 76, 182 106 C 182 136, 158 158, 128 158 C 98 158, 74 136, 74 106 C 74 76, 96 52, 128 52 Z" fill="url(#rose)"/>
        <path d="M121 158 L 135 158 L 128 170 Z" fill="#d96a55"/>
        <path d="M128 170 C 120 184, 138 192, 128 208" fill="none" stroke="#d98a5f" stroke-width="5" stroke-linecap="round"/>
        <ellipse cx="106" cy="92" rx="13" ry="18" fill="#ffffff" opacity="0.5" transform="rotate(-18 106 92)"/>
      </g>`)}
      <g>
        <path d="M128 52 C 160 52, 182 76, 182 106 C 182 136, 158 158, 128 158 C 98 158, 74 136, 74 106 C 74 76, 96 52, 128 52 Z" fill="url(#rose)"/>
        <path d="M121 158 L 135 158 L 128 170 Z" fill="#d96a55"/>
        <path d="M128 170 C 120 184, 138 192, 128 208" fill="none" stroke="#d98a5f" stroke-width="5" stroke-linecap="round"/>
        <ellipse cx="106" cy="92" rx="13" ry="18" fill="#ffffff" opacity="0.5" transform="rotate(-18 106 92)"/>
      </g>
    </g>
  `),
}

for (const [name, svg] of Object.entries(icons)) {
  const cleaned = svg.replaceAll('${BLUR}', '4')
  const png = await sharp(Buffer.from(cleaned)).png().toBuffer()
  const out = path.join(outDir, `anniv-${name}.png`)
  await writeFile(out, png)
  const meta = await sharp(out).metadata()
  console.log(`${out} ${meta.width}x${meta.height}`)
}
