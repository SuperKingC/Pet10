// 临时工具：把被量化损伤的图片从 git 里的真彩原图重编码为「256 色全色板 + 误差扩散抖动」，
// 文件名统一升 -v2（小程序对同路径图片有不可清缓存，换图必须升名）。
// moods 额外把尺寸回到原生 160px（当前 256px 是拉伸放大产物）。
// 用法：node tools/tmp-fidelity-apply.mjs
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const sharp = require('sharp')
const root = resolve(import.meta.dirname, '../..')
const assetsRoot = resolve(root, 'miniapp/src/assets')

// [旧相对路径, 新相对路径, 编码模式]
// palette256: 256 色全色板 + dither 1.0（视觉最接近原图的索引色方案）
// native256:  原生尺寸 + 同上（用于把历史拉伸放大改回原生分辨率）
const jobs = [
  ['journal/action-photo.png', 'journal/action-photo-v2.png', 'palette256'],
  ['journal/action-write.png', 'journal/action-write-v2.png', 'palette256'],
  ['journal/polaroid-run.png', 'journal/polaroid-run-v2.png', 'palette256'],
  ['journal/polaroid-sit.png', 'journal/polaroid-sit-v2.png', 'palette256'],
  ['journal/puppy-cushion.png', 'journal/puppy-cushion-v2.png', 'palette256'],
  ['messages-empty.png', 'messages-empty-v2.png', 'palette256'],
  ['nest/xiaoduoli-body.png', 'nest/xiaoduoli-body-v2.png', 'palette256'],
  ['nest/xiaoduoli-eyes.png', 'nest/xiaoduoli-eyes-v2.png', 'palette256'],
  ['moods/mood-1.png', 'moods/mood-1-v2.png', 'native256'],
  ['moods/mood-2.png', 'moods/mood-2-v2.png', 'native256'],
  ['moods/mood-3.png', 'moods/mood-3-v2.png', 'native256'],
  ['moods/mood-4.png', 'moods/mood-4-v2.png', 'native256'],
]

function gitOrig(rel) {
  const revs = execSync(`git log --format="%h" -- "miniapp/src/assets/${rel}"`, { cwd: root })
    .toString().trim().split('\n').filter(Boolean).reverse()
  for (const rev of revs) {
    try {
      const b = execSync(`git show ${rev}:miniapp/src/assets/${rel}`, { cwd: root, maxBuffer: 1 << 26 })
      if (b.slice(1, 4).toString() === 'PNG' && (b[25] === 6 || b[25] === 2)) return b
    } catch { /* 该版本不存在，继续往前找 */ }
  }
  throw new Error(`${rel} 找不到真彩历史版本`)
}

let delta = 0
for (const [oldRel, newRel, mode] of jobs) {
  const orig = gitOrig(oldRel)
  const curBytes = readFileSync(resolve(assetsRoot, oldRel)).length
  const curW = curBytes && 0 // 占位，实际从文件头读
  void curW
  const old = readFileSync(resolve(assetsRoot, oldRel))
  const w = old.readUInt32BE(16)
  const h = old.readUInt32BE(20)
  let pipeline = sharp(orig, { failOn: 'none' })
  if (mode === 'palette256') pipeline = pipeline.resize(w, h, { fit: 'fill' })
  if (mode === 'native256') {
    const m = await sharp(orig, { failOn: 'none' }).metadata()
    pipeline = sharp(orig, { failOn: 'none' }).resize(m.width, m.height, { fit: 'fill' })
  }
  const out = await pipeline.png({ palette: true, colors: 256, quality: 100, effort: 10, dither: 1 }).toBuffer()
  writeFileSync(resolve(assetsRoot, newRel), out)
  delta += out.length - curBytes
  const meta = await sharp(out).metadata()
  console.log(`${oldRel} (${(curBytes / 1024).toFixed(0)}K ${w}x${h}) -> ${newRel} (${(out.length / 1024).toFixed(0)}K ${meta.width}x${meta.height})`)
}
console.log(`合计体积变化: ${(delta / 1024).toFixed(1)}K（正数为增大；基线余量 47K，street 换 v9 另有变化）`)
