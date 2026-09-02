// 黑狗 chroma key 抠图管线：把 gen-chroma-garments.mjs 生成的「黑剪影狗穿衣」图
// ① 检测黑剪影 bbox 与原装立绘犬身 bbox 做等比仿射对齐（底边+水平居中）
// ② 键控抠除黑色狗身（软 alpha 羽化黑边）
// ③ 边界泛洪去除残留白底（胸前白抽绳等内部白色件保留）
// ④ 输出 436×700 全画布服装叠层 public/wardrobe/{suit}-layer-v6.png
//    ——全画布定位 {left:0,top:0,width:100%}，位置由生成图天然决定，不再人工标定
// 运行：node miniapp/tools/cut-chroma-garments.mjs
import { writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(import.meta.dirname, '../..')
const BASE_W = 436
const BASE_H = 700
const SUITS = ['hoodie', 'overalls', 'dress', 'raincoat', 'pajamas']

// 黑键控阈值：max(r,g,b) 低于此值视为狗身；其上 40 内为羽化过渡带
const BLACK_MAX = 70
const BLACK_FADE = 40
// 泛洪白底阈值（近白视为背景；胸前抽绳等被衣服包围的白色不受影响）
const WHITE_MIN = 242

async function rawOf(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data, w: info.width, h: info.height }
}

function bboxOf(data, w, h, isInside) {
  let minX = w, minY = h, maxX = -1, maxY = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4
      if (isInside(data, o)) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) throw new Error('bbox empty')
  return { minX, minY, maxX, maxY }
}

const isBlack = (data, o) => data[o + 3] > 100 && Math.max(data[o], data[o + 1], data[o + 2]) < BLACK_MAX

// —— 原装立绘犬身 bbox（立绘带不透明底：以角落底色为参照，色差大者为狗） ——
const basePng = path.join(root, 'miniapp/src/assets/xiaoduoli.png')
const baseRaw = await rawOf(basePng)
const isBaseDog = (d, o) => d[o + 3] > 120
const baseBbox = bboxOf(baseRaw.data, baseRaw.w, baseRaw.h, isBaseDog)
console.log('base dog bbox', JSON.stringify(baseBbox))

const report = []
const layers = {}
for (const suit of SUITS) {
  const src = path.join(root, `design-assets/wardrobe/gen-${suit}-chroma-v1.png`)
  if (!existsSync(src)) {
    console.warn(`跳过 ${suit}：源图未生成`)
    continue
  }
  const genRaw = await rawOf(src)
  const dogBbox = bboxOf(genRaw.data, genRaw.w, genRaw.h, isBlack)
  // 等比缩放：黑剪影高 → 原装犬身高；水平按 bbox 中心对齐、垂直按底边对齐
  const GROW = 1.08 // 包裹放大：服装层绕底边中心再放大，盖住肩胛/跨部外侧露毛（用户反馈衣服小一圈）
  const scale = ((baseBbox.maxY - baseBbox.minY + 1) / (dogBbox.maxY - dogBbox.minY + 1)) * GROW
  const scaledW = Math.max(1, Math.round(genRaw.w * scale))
  const scaled = await sharp(src).resize(scaledW).png().toBuffer()
  const sm = await rawOf(scaled)
  const sDog = bboxOf(sm.data, sm.w, sm.h, isBlack)
  const offX = Math.round((baseBbox.minX + baseBbox.maxX) / 2 - (sDog.minX + sDog.maxX) / 2)
  const offY = Math.round(baseBbox.maxY - sDog.maxY)
  console.log(`${suit}: scale=${scale.toFixed(3)} off=(${offX},${offY})`)

  // 键控：生成图逐像素 → 贴到 436×700 画布（对齐后坐标），黑→软透明
  const canvas = Buffer.alloc(BASE_W * BASE_H * 4)
  for (let y = 0; y < sm.h; y++) {
    const cy = y + offY
    if (cy < 0 || cy >= BASE_H) continue
    for (let x = 0; x < sm.w; x++) {
      const cx = x + offX
      if (cx < 0 || cx >= BASE_W) continue
      const so = (y * sm.w + x) * 4
      if (sm.data[so + 3] < 10) continue
      const v = Math.max(sm.data[so], sm.data[so + 1], sm.data[so + 2])
      let alpha
      if (v < BLACK_MAX) alpha = 0 // 黑狗身
      else if (v < BLACK_MAX + BLACK_FADE) alpha = Math.round(((v - BLACK_MAX) / BLACK_FADE) * 255) // 黑边羽化
      else alpha = sm.data[so + 3]
      if (alpha === 0) continue
      // 上颌区残留清理：生成的狗张嘴时粉舌头/口腔/嘴部深描边会留在叠层上，与底图嘴部叠出重影——
      // 画布 y<395 内的暗色（描边/黑边）与粉舌/暗红口腔色一并置透明（衣服在领口以下，不受影响）
      if (cy < 395) {
        const r = sm.data[so], g = sm.data[so + 1], b = sm.data[so + 2]
        const dark = v < 150
        const tongue = r > 180 && r - Math.max(g, b) > 35
        const mouth = r > 90 && r < 200 && g < 95 && b < 95
        if (dark || tongue || mouth) continue
      }
      const co = (cy * BASE_W + cx) * 4
      canvas[co] = sm.data[so]
      canvas[co + 1] = sm.data[so + 1]
      canvas[co + 2] = sm.data[so + 2]
      canvas[co + 3] = alpha
    }
  }
  // 泛洪去白底：从画布四边进入的近白连通区置透明（内部白色件保留）
  {
    const W = BASE_W, H = BASE_H
    const isBgPx = (o) => canvas[o + 3] === 0 ||
      (canvas[o] >= WHITE_MIN && canvas[o + 1] >= WHITE_MIN - 2 && canvas[o + 2] >= WHITE_MIN - 6)
    const bg = new Uint8Array(W * H)
    const q = []
    for (let x = 0; x < W; x++) {
      for (const y of [0, H - 1]) {
        const m = y * W + x
        if (!bg[m] && isBgPx(m * 4)) { bg[m] = 1; q.push(m) }
      }
    }
    for (let y = 0; y < H; y++) {
      for (const x of [0, W - 1]) {
        const m = y * W + x
        if (!bg[m] && isBgPx(m * 4)) { bg[m] = 1; q.push(m) }
      }
    }
    while (q.length) {
      const m = q.pop()
      const x = m % W, y = (m / W) | 0
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
        const nm = ny * W + nx
        if (!bg[nm] && isBgPx(nm * 4)) { bg[nm] = 1; q.push(nm) }
      }
    }
    for (let i = 0; i < W * H; i++) {
      if (bg[i]) canvas[i * 4 + 3] = 0
    }
  }
  // 连通成分去噪：保留 ≥0.5% 画布像素的成分（衣服本体/大部件），黑边碎屑清除
  {
    const n = BASE_W * BASE_H
    const compId = new Int32Array(n).fill(-1)
    const sizes = []
    const stack = []
    for (let start = 0; start < n; start++) {
      if (canvas[start * 4 + 3] < 10 || compId[start] >= 0) continue
      const id = sizes.length
      let size = 0
      stack.push(start)
      compId[start] = id
      while (stack.length) {
        const m = stack.pop()
        size++
        const x = m % BASE_W, y = (m / BASE_W) | 0
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy
          if (nx < 0 || ny < 0 || nx >= BASE_W || ny >= BASE_H) continue
          const nm = ny * BASE_W + nx
          if (compId[nm] < 0 && canvas[nm * 4 + 3] >= 10) { compId[nm] = id; stack.push(nm) }
        }
      }
      sizes.push(size)
    }
    const maxSize = Math.max(...sizes, 1)
    let mainCompId = 0
    for (let i = 0; i < sizes.length; i++) {
      if (sizes[i] === maxSize) { mainCompId = i; break }
    }
    for (let i = 0; i < n; i++) {
      if (compId[i] >= 0 && sizes[compId[i]] < maxSize * 0.005) canvas[i * 4 + 3] = 0
    }
    // 头颈区（y<420）孤立斑块清除：生成图在已抠掉的黑头区域偶尔留下溅点/碎块，
    // 与衣服主体不相连且小于主体的 8%——按成分质心判定后丢弃（帽兜/肩布属于主成分不受影响）
    const compStats = new Map()
    for (let i = 0; i < n; i++) {
      const id = compId[i]
      if (id < 0 || canvas[i * 4 + 3] < 10) continue
      const st = compStats.get(id) ?? { size: 0, sumY: 0 }
      st.size++
      st.sumY += (i / BASE_W) | 0
      compStats.set(id, st)
    }
    for (const [id, st] of compStats) {
      if (id === mainCompId) continue
      if (st.size < maxSize * 0.08 && st.sumY / st.size < 420) {
        for (let i = 0; i < n; i++) {
          if (compId[i] === id) canvas[i * 4 + 3] = 0
        }
      }
    }
  }
  // 黑→白过渡带的抗锯齿灰环清除：对 alpha 做 3 轮最小值侵蚀——
  // 紧邻透明区的灰环逐轮变透明，衣服自身边缘仅收 3px 且更柔和
  for (let iter = 0; iter < 2; iter++) {
    const src = Buffer.from(canvas)
    for (let y = 0; y < BASE_H; y++) {
      for (let x = 0; x < BASE_W; x++) {
        const o = (y * BASE_W + x) * 4 + 3
        let minA = src[o]
        if (x > 0) minA = Math.min(minA, src[o - 4])
        if (x < BASE_W - 1) minA = Math.min(minA, src[o + 4])
        if (y > 0) minA = Math.min(minA, src[o - BASE_W * 4])
        if (y < BASE_H - 1) minA = Math.min(minA, src[o + BASE_W * 4])
        if (minA < canvas[o]) canvas[o] = minA
      }
    }
  };
  // 软扩边：衣服边缘向外生长 2 轮（带颜色复制、alpha 衰减），把相邻的底图毛包进衣服边缘——
  // 生成图衣服略窄于黑剪影身体时，边缘会露毛；外扩后读作衣服包住蓬毛
  for (let iter = 0; iter < 2; iter++) {
    const src = Buffer.from(canvas)
    for (let y = 0; y < BASE_H; y++) {
      for (let x = 0; x < BASE_W; x++) {
        const o = (y * BASE_W + x) * 4
        if (src[o + 3] >= 40) continue
        let bestA = 0
        let br = 0, bg2 = 0, bb = 0
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy
          if (nx < 0 || ny < 0 || nx >= BASE_W || ny >= BASE_H) continue
          const no = (ny * BASE_W + nx) * 4
          if (src[no + 3] > bestA) { bestA = src[no + 3]; br = src[no]; bg2 = src[no + 1]; bb = src[no + 2] }
        }
        if (bestA > 40) {
          canvas[o] = br; canvas[o + 1] = bg2; canvas[o + 2] = bb
          canvas[o + 3] = Math.min(220, Math.round(bestA * 0.8))
        }
      }
    }
  }
  const png = await sharp(canvas, { raw: { width: BASE_W, height: BASE_H, channels: 4 } })
    .png({ palette: true, colors: 256, compressionLevel: 9 })
    .toBuffer()
  const out = path.join(root, `public/wardrobe/${suit}-layer-v6.png`)
  await writeFile(out, png)
  layers[suit] = true
  report.push({ key: suit, file: `public/wardrobe/${suit}-layer-v6.png`, src: `design-assets/wardrobe/gen-${suit}-chroma-v1.png`, bytes: png.byteLength, scale: Number(scale.toFixed(3)) })
  console.log(`${suit}-layer-v6.png ${(png.byteLength / 1024).toFixed(1)}KB`)
}

console.log('\n// 全画布服装叠层：定位恒为 {left:0%, top:0%, width:100%}（位置由 chroma 生成图决定）')
await writeFile(path.join(import.meta.dirname, 'body-layers.report.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), canvas: [BASE_W, BASE_H], placement: { left: '0.00%', top: '0.00%', width: '100.00%' }, layers: report }, null, 2)}\n`)

// —— 蒙特奇：原装 + 全画布层（1.4×）+ 三配饰 ——
const SCALE = 1.4
const accBufs = {}
const ACCESSORIES = {
  hat: ['miniapp/src/assets/wardrobe/outfit-hat-v3.png', 25.0, 3.14, 50.0],
  scarf: ['miniapp/src/assets/wardrobe/outfit-scarf-cut-v2.png', 21.1, 57.86, 57.8],
  bag: ['miniapp/src/assets/wardrobe/outfit-bag-v3.png', 21.1, 74.0, 27.52]
}
for (const [acc, [file]] of Object.entries(ACCESSORIES)) {
  accBufs[acc] = await sharp(path.join(root, file)).ensureAlpha().png().toBuffer()
}
const baseBuf = await sharp(basePng).resize(Math.round(BASE_W * SCALE), Math.round(BASE_H * SCALE)).png().toBuffer()
const tiles = []
let x = 0
for (const suit of SUITS) {
  if (!layers[suit]) continue
  const comps = [{ input: baseBuf, left: 0, top: 0 }]
  comps.push({ input: await sharp(path.join(root, `public/wardrobe/${suit}-layer-v6.png`)).resize(Math.round(BASE_W * SCALE), Math.round(BASE_H * SCALE)).png().toBuffer(), left: 0, top: 0 })
  for (const [acc, [, l, t, w]] of Object.entries(ACCESSORIES)) {
    comps.push({
      input: await sharp(accBufs[acc]).resize({ width: Math.round((w / 100) * BASE_W * SCALE) }).png().toBuffer(),
      left: Math.round((l / 100) * BASE_W * SCALE),
      top: Math.round((t / 100) * BASE_H * SCALE)
    })
  }
  tiles.push({ input: await sharp({ create: { width: Math.round(BASE_W * SCALE), height: Math.round(BASE_H * SCALE), channels: 4, background: '#fdf3e3' } }).composite(comps).png().toBuffer(), left: x, top: 0 })
  x += Math.round(BASE_W * SCALE) + 8
}
if (tiles.length) {
  await sharp({ create: { width: x, height: Math.round(BASE_H * SCALE), channels: 4, background: '#efe2cc' } })
    .composite(tiles).png().toFile(path.join(import.meta.dirname, 'tmp-body-layer-preview.png'))
  console.log('preview -> miniapp/tools/tmp-body-layer-preview.png')
}
