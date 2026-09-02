// 红色简版绒毛玩偶出件：SVG → sharp PNG8，public/wardrobe/xiaoduoli-doll-v3.png
// 用户要求「就是一个红色的玩偶，不要太精细」：泰迪熊式圆胖剪影 + 点睛五官，不做复杂毛发纹理
// 可重跑：node miniapp/tools/make-red-doll.mjs
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'

const OUT = resolve(import.meta.dirname, '../../public/wardrobe/xiaoduoli-doll-v3.png')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 352">
  <g stroke="#a63a34" stroke-width="5" stroke-linejoin="round">
    <circle cx="60" cy="56" r="34" fill="#c74a42"/>
    <circle cx="196" cy="56" r="34" fill="#c74a42"/>
    <ellipse cx="68" cy="250" rx="28" ry="52" fill="#c74a42"/>
    <ellipse cx="188" cy="250" rx="28" ry="52" fill="#c74a42"/>
    <ellipse cx="94" cy="304" rx="28" ry="44" fill="#c74a42"/>
    <ellipse cx="162" cy="304" rx="28" ry="44" fill="#c74a42"/>
    <ellipse cx="128" cy="256" rx="76" ry="88" fill="#d4524a"/>
    <ellipse cx="128" cy="116" rx="88" ry="84" fill="#d4524a"/>
  </g>
  <ellipse cx="128" cy="272" rx="46" ry="58" fill="#ef9a90"/>
  <ellipse cx="56" cy="60" rx="15" ry="19" fill="#ef9a90"/>
  <ellipse cx="200" cy="60" rx="15" ry="19" fill="#ef9a90"/>
  <circle cx="99" cy="106" r="10" fill="#3f241e"/>
  <circle cx="157" cy="106" r="10" fill="#3f241e"/>
  <circle cx="102" cy="102" r="3.5" fill="#ffffff"/>
  <circle cx="160" cy="102" r="3.5" fill="#ffffff"/>
  <ellipse cx="128" cy="132" rx="12" ry="9" fill="#3f241e"/>
  <path d="M128 141 q0 10 -11 12 M128 141 q0 10 11 12" stroke="#3f241e" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M128 36 v20" stroke="#a63a34" stroke-width="4" stroke-dasharray="7 6" fill="none" stroke-linecap="round"/>
</svg>`

const png = await sharp(Buffer.from(svg))
  .resize(256, 352)
  .png({ palette: true, colors: 32, compressionLevel: 9 })
  .toFile(OUT)

console.log('wrote', OUT, `${png.width}x${png.height}`, png.size, 'bytes')
writeFileSync(resolve(import.meta.dirname, 'red-doll.report.json'), JSON.stringify({ out: 'public/wardrobe/xiaoduoli-doll-v3.png', width: png.width, height: png.height, bytes: png.size }, null, 2))
