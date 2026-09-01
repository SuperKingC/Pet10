// 衣柜锁定态徽章：手绘贴纸风小金锁（深棕描边 + 金色锁体 + 奶油锁孔 + 星星），透明底。
// 风格对齐 make-item-icons.mjs；出件 128×128 PNG8。
// 运行：node miniapp/tools/make-wardrobe-lock.mjs
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const outDir = path.resolve(import.meta.dirname, '../src/assets/wardrobe')
await mkdir(outDir, { recursive: true })

const STROKE = '#3a2417'
const GOLD = '#f7c66b'
const GOLD_DEEP = '#e8a94e'
const CREAM = '#fcfcf7'
const ORANGE_DEEP = '#d08b4b'

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <!-- 锁梁 -->
  <path d="M 44 60 L 44 42 a 20 20 0 0 1 40 0 L 84 60" fill="none" stroke="${STROKE}" stroke-width="13" stroke-linecap="round"/>
  <path d="M 44 60 L 44 42 a 20 20 0 0 1 40 0 L 84 60" fill="none" stroke="${GOLD_DEEP}" stroke-width="6" stroke-linecap="round"/>
  <!-- 锁体 -->
  <rect x="26" y="56" width="76" height="56" rx="14" fill="${GOLD}" stroke="${STROKE}" stroke-width="9"/>
  <path d="M 34 64 q 30 -8 60 0" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" opacity=".65"/>
  <!-- 锁孔 -->
  <circle cx="64" cy="80" r="8" fill="${STROKE}"/>
  <rect x="60" y="84" width="8" height="13" rx="4" fill="${STROKE}"/>
  <!-- 星星点缀 -->
  <path d="M 104 30 l 0 18 M 95 39 l 18 0" stroke="${ORANGE_DEEP}" stroke-width="7" stroke-linecap="round" fill="none" opacity=".85"/>
  <path d="M 22 96 l 0 12 M 16 102 l 12 0" stroke="${ORANGE_DEEP}" stroke-width="6" stroke-linecap="round" fill="none" opacity=".6"/>
  <circle cx="24" cy="28" r="4" fill="${CREAM}" stroke="${STROKE}" stroke-width="5"/>
</svg>`

const out = await sharp(Buffer.from(svg)).png({ palette: true, quality: 100, colors: 256, effort: 10, dither: 1 }).toBuffer()
await writeFile(path.join(outDir, 'lock-badge-v1.png'), out)
console.log('lock-badge-v1.png', `${(out.length / 1024).toFixed(1)}K`)
