// 衣柜素材 v2：网格服装特写图标 ×8 + 帽子/围巾/小包三件「叠穿服装件」紧裁图
// —— 主体服装(连帽衫/背带裤/小裙子/雨衣/睡衣)保留整套穿装立绘：素材中衣服与狗身融合，无法拆件叠加。
// —— 叠穿件在 app 内按 wardrobeModel.ts 的定位元数据(与下表 cx/ty/w 一致)绝对定位叠到原装立绘上，
//    网格图标与叠穿图层共用同一张紧裁文件，控制包体。
// 落点：三件叠穿件随包(public 同步一份供清单)；主体服装的立绘+图标上 COS 按需下载。
// 运行：node miniapp/tools/make-wardrobe-suits.mjs
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const srcDir = path.resolve(import.meta.dirname, '../../design-assets/wardrobe')
const cosOutDir = path.resolve(import.meta.dirname, '../../public/wardrobe')
const bundledOutDir = path.resolve(import.meta.dirname, '../src/assets/wardrobe')
const BASE_W = 436
const BASE_H = 700

async function loadCanvas(name) {
  return readFile(path.join(srcDir, `${name}.png`))
}

/** 256 画布坐标转底图坐标：服装内容 bbox → 羽化裁切 → 缩放 → 全画布对位图层 */
async function buildLayer(srcName, box, feather = 8) {
  // box: {x1,y1,x2,y2} 在 256 画布上的裁切区（含内容）
  const raw = await sharp(await loadCanvas(srcName)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const w = raw.info.width
  const x1 = box.x1 - feather, y1 = box.y1 - feather
  const x2 = box.x2 + feather, y2 = box.y2 + feather
  const cw = x2 - x1, ch = y2 - y1
  const px = Buffer.alloc(cw * ch * 4)
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const sx = Math.min(Math.max(x1 + x, 0), w - 1)
      const sy = Math.min(Math.max(y1 + y, 0), 255)
      const so = (sy * w + sx) * 4
      const doff = (y * cw + x) * 4
      // 距裁切内区的边缘距离 → 羽化 alpha
      const edge = Math.min(x - feather, y - feather, cw - feather - x, ch - feather - y)
      const k = Math.max(0, Math.min(1, (edge + feather) / feather))
      px[doff] = raw.data[so]
      px[doff + 1] = raw.data[so + 1]
      px[doff + 2] = raw.data[so + 2]
      px[doff + 3] = Math.round(raw.data[so + 3] * k)
    }
  }
  return { data: px, width: cw, height: ch, content: { x: feather, y: feather, w: box.x2 - box.x1, h: box.y2 - box.y1 } }
}

/** 把裁切件缩放放到 436×700 底图画布：cx/ty 为底图坐标（内容中心 x、顶 y），w 为目标内容宽 */
async function buildIcon(srcName, box) {
  const raw = await sharp(await loadCanvas(srcName)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const w = raw.info.width
  const cw = box.x2 - box.x1, ch = box.y2 - box.y1
  const px = Buffer.alloc(cw * ch * 4)
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const so = ((box.y1 + y) * w + (box.x1 + x)) * 4
      const doff = (y * cw + x) * 4
      px[doff] = raw.data[so]; px[doff + 1] = raw.data[so + 1]; px[doff + 2] = raw.data[so + 2]; px[doff + 3] = raw.data[so + 3]
    }
  }
  return sharp(px, { raw: { width: cw, height: ch, channels: 4 } })
    .resize(176, 176, { fit: 'inside', kernel: 'lanczos3' })
    .png({ palette: true, colors: 128, compressionLevel: 9 })
    .toBuffer()
}

// —— 服装区域标定（256 画布坐标，经屏上目检）——
// 叠穿定位元数据（底图 436×700）：left%=(cx-w/2)/436, top%=ty/700, width%=w/436
//   hat:   cx=218 ty=52  w=186 → left 28.67% top 7.43%  width 42.66%
//   scarf: cx=218 ty=344 w=238 → left 22.71% top 49.14% width 54.59%
//   bag:   cx=158 ty=498 w=100 → left 24.77% top 71.14% width 22.94%
const overlaySuits = {
  // 帽子：紫色贝雷帽散件，戴在头顶
  hat: {
    garment: { src: 'purple-beret', box: { x1: 98, y1: 202, x2: 156, y2: 243 } },
    cx: 218, ty: 52, w: 186
  },
  // 围巾：从围巾狗上切领巾（含小花），贴到脖子下方（脸/舌在画布 y119-187，领巾在其下）
  scarf: {
    garment: { src: 'scarf', box: { x1: 86, y1: 190, x2: 168, y2: 214 } },
    cx: 218, ty: 358, w: 238
  },
  // 小包：斜挎包散件，挂身体左侧腹位
  bag: {
    garment: { src: 'crossbody-bag', box: { x1: 100, y1: 189, x2: 154, y2: 243 } },
    cx: 150, ty: 528, w: 108
  }
}

const bodySuits = ['hoodie', 'overalls', 'dress', 'raincoat', 'pajamas']
const bodyIcons = {
  hoodie: { x1: 98, y1: 184, x2: 191, y2: 232 },
  overalls: { x1: 101, y1: 192, x2: 155, y2: 240 },
  dress: { x1: 86, y1: 188, x2: 169, y2: 230 },
  raincoat: { x1: 87, y1: 182, x2: 167, y2: 230 },
  pajamas: { x1: 92, y1: 178, x2: 163, y2: 228 }
}

await mkdir(cosOutDir, { recursive: true })
await mkdir(bundledOutDir, { recursive: true })
const report = { generatedAt: new Date().toISOString(), base: `${BASE_W}x${BASE_H}`, suits: [] }

// 三件叠穿件：紧裁服装图（网格图标与叠加图层共用），随包
for (const [key, def] of Object.entries(overlaySuits)) {
  const feather = 8
  const layer = await buildLayer(def.garment.src, def.garment.box, feather)
  // 目标内容宽（底图 436 坐标系），与 wardrobeModel.ts 的定位元数据一致
  const targetContentW = def.w
  const scale = targetContentW / layer.content.w
  const fileW = Math.round(layer.width * scale)
  const fileH = Math.round(layer.height * scale)
  const garmentPng = await sharp(layer.data, { raw: { width: layer.width, height: layer.height, channels: 4 } })
    .resize(fileW, fileH, { kernel: 'lanczos3' })
    .png({ palette: true, colors: 192, compressionLevel: 9 })
    .toBuffer()
  const file = `outfit-${key}-v1.png`
  await writeFile(path.join(cosOutDir, file), garmentPng)
  await copyFile(path.join(cosOutDir, file), path.join(bundledOutDir, file))
  const leftPct = ((def.cx - (layer.content.x + layer.content.w / 2) * scale) / BASE_W * 100)
  const topPct = ((def.ty - layer.content.y * scale) / BASE_H * 100)
  report.suits.push({
    key, kind: 'overlay',
    file: `public/wardrobe/${file}`,
    bundled: true,
    bytes: garmentPng.byteLength,
    // app 定位元数据（wardrobeModel.ts OUTFIT_LAYER_STYLE 同步维护）
    style: { left: `${leftPct.toFixed(2)}%`, top: `${topPct.toFixed(2)}%`, width: `${(fileW / BASE_W * 100).toFixed(2)}%` }
  })
  console.log(`${key}: garment ${(garmentPng.byteLength / 1024).toFixed(1)}KB (bundled) style ${JSON.stringify(report.suits.at(-1).style)}`)
}

// 五件主体服装：整套穿装立绘（COS 按需）+ 服装特写图标（COS）
for (const key of bodySuits) {
  const render = await sharp(await loadCanvas(key)).trim().png().toBuffer()
  const full = await sharp(render).resize({ height: 320, fit: 'inside' }).png({ palette: true, colors: 256, compressionLevel: 9 }).toBuffer()
  const iconPng = await buildIcon(key, bodyIcons[key])
  const fullFile = `${key}-v1.png`
  const iconFile = `${key}-icon-v1.png`
  await writeFile(path.join(cosOutDir, fullFile), full)
  await writeFile(path.join(cosOutDir, iconFile), iconPng)
  report.suits.push({ key, kind: 'full-render', full: `public/wardrobe/${fullFile}`, icon: `public/wardrobe/${iconFile}`, bundled: false, fullBytes: full.byteLength, iconBytes: iconPng.byteLength })
  console.log(`${key}: full ${(full.byteLength / 1024).toFixed(1)}KB, icon ${(iconPng.byteLength / 1024).toFixed(1)}KB (COS)`)
}

await writeFile(path.resolve(import.meta.dirname, 'wardrobe-suits.report.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log(`done: ${report.suits.length} suits`)
