// 生成衣柜套装立绘：从 design-assets/wardrobe 的源图（2026-08 旧版换装素材恢复）
// 切出 8 套「小多利+该服饰」整套立绘，规范为统一高度 320px 的透明底 PNG8。
// —— 围巾/连帽衫/背带裤/小裙子/雨衣/睡衣：源图已是整套穿装立绘，直接裁透明边；
// —— 帽子：围巾款小狗 + 贝雷帽合成；小包：连帽衫款小狗 + 斜挎包合成（摆件位置经屏上目检定稿）。
// 落点：8 张全量到 public/wardrobe/（随 upload:static 发布到 COS 供按需下载），
//       其中围巾另拷进 miniapp/src/assets/wardrobe/（随包内置，包体红线内只带这一张）。
// 运行：node miniapp/tools/make-wardrobe-suits.mjs
// 产物：public/wardrobe/{key}-v1.png + miniapp/src/assets/wardrobe/scarf-v1.png + tools/wardrobe-suits.report.json
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const srcDir = path.resolve(import.meta.dirname, '../../design-assets/wardrobe')
const cosOutDir = path.resolve(import.meta.dirname, '../../public/wardrobe')
const bundledOutDir = path.resolve(import.meta.dirname, '../src/assets/wardrobe')
const TARGET_HEIGHT = 320

async function trimmed(name) {
  const buffer = await readFile(path.join(srcDir, `${name}.png`))
  return sharp(buffer).trim().png().toBuffer()
}

async function metadataOf(buffer) {
  return sharp(buffer).metadata()
}

/** 缩放到统一高度（宽按比例），输出 256 色 PNG8 压小体积 */
async function normalize(render) {
  return sharp(render)
    .resize({ height: TARGET_HEIGHT, fit: 'inside' })
    .png({ palette: true, colors: 256, compressionLevel: 9 })
    .toBuffer()
}

/** 配饰相对基础立绘的尺寸/定位（按基础裁边后尺寸取比例，避免裁边漂移错位） */
async function composeAccessory(baseName, accessoryName, place) {
  const base = await trimmed(baseName)
  const accessory = await trimmed(accessoryName)
  const baseMeta = await metadataOf(base)
  const accessoryMeta = await metadataOf(accessory)
  const size = place.size(baseMeta.width, baseMeta.height)
  const scaled = await sharp(accessory)
    .resize(Math.max(1, Math.round(size.width)), Math.max(1, Math.round(size.height)), { fit: 'fill' })
    .png()
    .toBuffer()
  const position = place.position(baseMeta.width, baseMeta.height, Math.round(size.width), Math.round(size.height))
  const composite = await sharp({
    create: {
      width: Math.max(baseMeta.width, position.left + Math.round(size.width)),
      height: Math.max(baseMeta.height, position.top + Math.round(size.height)),
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([
      { input: base, left: 0, top: 0 },
      { input: scaled, left: position.left, top: position.top }
    ])
    .png()
    .toBuffer()
  return sharp(composite).trim().png().toBuffer()
}

const suits = [
  { key: 'scarf', render: () => trimmed('scarf') },
  { key: 'hoodie', render: () => trimmed('hoodie') },
  { key: 'overalls', render: () => trimmed('overalls') },
  { key: 'dress', render: () => trimmed('dress') },
  { key: 'raincoat', render: () => trimmed('raincoat') },
  { key: 'pajamas', render: () => trimmed('pajamas') },
  // 帽子：贝雷帽戴在围巾款头顶（宽约等于头宽的 53%，压头顶居中）
  {
    key: 'hat',
    render: () => composeAccessory('scarf', 'purple-beret', {
      size: (width, height) => ({ width: width * 0.53, height: width * 0.53 * 0.72 }),
      position: (width, _height, sizedWidth) => ({ left: Math.round((width - sizedWidth) / 2), top: 0 })
    })
  },
  // 小包：斜挎包挂在连帽衫款身侧偏下（约身高 29% 大小，盖住身侧）
  {
    key: 'bag',
    render: () => composeAccessory('hoodie', 'crossbody-bag', {
      size: (_width, height) => ({ width: height * 0.29, height: height * 0.29 }),
      position: (_width, height) => ({ left: Math.round(height * 0.02), top: Math.round(height * 0.47) })
    })
  }
]

await mkdir(cosOutDir, { recursive: true })
await mkdir(bundledOutDir, { recursive: true })
const report = { generatedAt: new Date().toISOString(), targetHeight: TARGET_HEIGHT, suits: [] }
for (const suit of suits) {
  const render = await suit.render()
  const png = await normalize(render)
  const meta = await metadataOf(png)
  const fileName = `${suit.key}-v1.png`
  await writeFile(path.join(cosOutDir, fileName), png)
  const entry = {
    key: suit.key,
    file: `public/wardrobe/${fileName}`,
    width: meta.width,
    height: meta.height,
    bytes: png.byteLength
  }
  if (suit.key === 'scarf') {
    await copyFile(path.join(cosOutDir, fileName), path.join(bundledOutDir, fileName))
    entry.bundledCopy = 'miniapp/src/assets/wardrobe/scarf-v1.png'
  }
  report.suits.push(entry)
  console.log(`${fileName}: ${meta.width}x${meta.height} ${(png.byteLength / 1024).toFixed(1)}KB${entry.bundledCopy ? ' (+bundled)' : ''}`)
}
await writeFile(
  path.resolve(import.meta.dirname, 'wardrobe-suits.report.json'),
  `${JSON.stringify(report, null, 2)}\n`
)
console.log(`done: ${report.suits.length} suits`)
