// 小多利站姿眨眼眼层切件（站姿 436×700 画布，xiaoduoli.png 同源）：
//  1) xiaoduoli-sit-eyes-v1.png     = 眼组层：双眼矩形（眼球 bbox 外扩 PAD）原图像素拷贝+边缘羽化，
//                                     静止时与底图逐像素一致；眨眼时整层绕双眼平均高度支点压扁成闭眼线
//  2) xiaoduoli-sit-underlay-v1.png = 眼窝底毛层：眼球 bbox 外扩 GROW 的椭圆毛色垫层（逐角度采样椭圆外
//                                     纯毛区毛色，颜色先于透明度混回原图色后 alpha 才渐隐——椭圆边界在
//                                     合成结果中逐像素不可见）；常驻盖住底图原眼，眨眼压扁后露出成闭眼眼睑
// 两层都只裁共享条带 STRIP（显示对位常量写进 PetStatusCard，与本案同源），PNG8 出件到 public/wardrobe（COS 按需下载）。
// 管线移植自 tools/build-xiaoduoli-parts.mjs（箱中眨眼同款，参数按站姿眼部实测重标定）。
// 运行：node miniapp/tools/cut-xiaoduoli-sit-eye-layers.mjs
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const srcPath = path.resolve(import.meta.dirname, '../src/assets/xiaoduoli.png')
const outDir = path.resolve(import.meta.dirname, '../../public/wardrobe')

// 画布 = 站姿立绘 436×700；双眼眼球 bbox 来自暗色连通域实测（tools 内联脚本 2026-09-02）
const CANVAS = { width: 436, height: 700 }
const EYES = [
  { name: 'left', rect: { x: 119, y: 167, w: 47, h: 55 } },
  { name: 'right', rect: { x: 267, y: 169, w: 49, h: 54 } },
]
// 眼组矩形外扩（盖住眼睑褶皱）与边缘羽化；底毛椭圆外扩。
// 不变量（箱中方案成立前提）：GROW ≤ PAD - FEATHER —— 底毛椭圆必须完全藏在眼组层
// 不透明核心内，否则静止时会露出平毛环；眨眼压扁后露出的闭眼睑=完整椭圆
const PAD = 14
const FEATHER = 6
const GROW = 8
// 底毛：颜色 solid 到 d=0.85，0.85..0.99 混回原图色，之后 alpha 渐隐（边界逐像素不可见）
const BLEND_FROM = 0.85
const BLEND_TO = 0.99
const SOLID = 0.94
// 共享条带（包含双眼眼组矩形+羽化余量），两层同框同坐标叠放
const STRIP = { x: 98, y: 146, w: 240, h: 98 }

const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
if (info.width !== CANVAS.width || info.height !== CANVAS.height) {
  throw new Error(`站姿图尺寸 ${info.width}x${info.height} 与画布不符`)
}
const srcAt = (x, y) => {
  const i = (y * CANVAS.width + x) * 4
  return [data[i], data[i + 1], data[i + 2], data[i + 3]]
}
const smoothstep = (t) => {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
}

// ---------- 眼组层：条带画布，双眼矩形原图拷贝+羽化 ----------
const eyes = Buffer.alloc(STRIP.w * STRIP.h * 4)
for (const eye of EYES) {
  const rect = {
    x: Math.max(STRIP.x, eye.rect.x - PAD),
    y: Math.max(STRIP.y, eye.rect.y - PAD),
    w: eye.rect.w + PAD * 2,
    h: eye.rect.h + PAD * 2,
  }
  for (let py = 0; py < rect.h; py += 1) {
    for (let px = 0; px < rect.w; px += 1) {
      const sx = rect.x + px
      const sy = rect.y + py
      if (sx < STRIP.x || sx >= STRIP.x + STRIP.w || sy < STRIP.y || sy >= STRIP.y + STRIP.h) continue
      const [r, g, b, a] = srcAt(sx, sy)
      const edge = Math.min(px, py, rect.w - 1 - px, rect.h - 1 - py)
      const outA = Math.min(a, edge >= FEATHER ? 255 : Math.round((255 * edge) / FEATHER))
      const di = ((sy - STRIP.y) * STRIP.w + (sx - STRIP.x)) * 4
      eyes[di] = r; eyes[di + 1] = g; eyes[di + 2] = b; eyes[di + 3] = outA
    }
  }
}

// ---------- 眼窝底毛层：条带画布，逐列垂直渐变毛色垫层（常驻盖住底图原眼，眨眼压扁后露出） ----------
// 站姿脸部明暗跨度大（眉毛暗斑/睫毛阴影），箱中同款逐角度环采样会产生放射状扇纹；
// 改回初代做法：椭圆每列采样眼上/眼下毛色（列端外 6px 的 3×3 均值）做纵向插值，
// 列样本再横向 ±6 列平滑去毛发噪声；边缘 0.85..0.99 混回原图色后 alpha 渐隐（边界逐像素不可见）
const underlay = Buffer.alloc(STRIP.w * STRIP.h * 4)
for (const eye of EYES) {
  const cx = eye.rect.x + eye.rect.w / 2
  const cy = eye.rect.y + eye.rect.h / 2
  const aAxis = eye.rect.w / 2 + GROW
  const bAxis = eye.rect.h / 2 + GROW
  const sampleCol = (x, y) => {
    let sr = 0; let sg = 0; let sb = 0; let n = 0
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const sx = Math.max(0, Math.min(CANVAS.width - 1, x + dx))
        const sy = Math.max(0, Math.min(CANVAS.height - 1, y + dy))
        const [r, g, b, a] = srcAt(sx, sy)
        if (a < 200) continue
        sr += r; sg += g; sb += b; n += 1
      }
    }
    return n ? [sr / n, sg / n, sb / n] : [189, 168, 130]
  }
  const x0 = Math.floor(cx - aAxis)
  const x1 = Math.ceil(cx + aAxis)
  const tops = []
  const bots = []
  for (let px = x0; px <= x1; px += 1) {
    tops.push(sampleCol(px, Math.round(cy - bAxis - 6)))
    bots.push(sampleCol(px, Math.round(cy + bAxis + 6)))
  }
  // 列样本横向平滑（±6 列盒式滤波），消除单根毛发采样尖峰
  const HALF_COL_WIN = 6
  const smoothCols = (cols) => cols.map((_, i) => {
    let sr = 0; let sg = 0; let sb = 0; let n = 0
    for (let db = -HALF_COL_WIN; db <= HALF_COL_WIN; db += 1) {
      const j = i + db
      if (j < 0 || j >= cols.length) continue
      sr += cols[j][0]; sg += cols[j][1]; sb += cols[j][2]; n += 1
    }
    return [sr / n, sg / n, sb / n]
  })
  const topsSmooth = smoothCols(tops)
  const botsSmooth = smoothCols(bots)
  for (let px = x0; px <= x1; px += 1) {
    const topC = topsSmooth[px - x0]
    const botC = botsSmooth[px - x0]
    for (let py = Math.floor(cy - bAxis); py <= Math.ceil(cy + bAxis); py += 1) {
      if (px < STRIP.x || px >= STRIP.x + STRIP.w || py < STRIP.y || py >= STRIP.y + STRIP.h) continue
      const dx = (px - cx) / aAxis
      const dy = (py - cy) / bAxis
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d >= 1) continue
      const ta = d <= SOLID ? 0 : smoothstep((d - SOLID) / (1 - SOLID))
      const alpha = Math.round(255 * (1 - ta))
      if (alpha <= 0) continue
      // 纵向插值：t=0 眼上毛色 → t=1 眼下毛色（smoothstep 软化中带过渡）
      const t = smoothstep((py - (cy - bAxis)) / (2 * bAxis))
      const furC = [0, 1, 2].map((c) => topC[c] * (1 - t) + botC[c] * t)
      const tb = d <= BLEND_FROM ? 0 : smoothstep((d - BLEND_FROM) / (BLEND_TO - BLEND_FROM))
      const [br, bg, bb] = srcAt(px, py)
      // 直写直色（非预乘）：半透明边界颜色已==原图色，合成结果逐像素同底图，无暗弧
      const di = ((py - STRIP.y) * STRIP.w + (px - STRIP.x)) * 4
      underlay[di] = Math.round(furC[0] * (1 - tb) + br * tb)
      underlay[di + 1] = Math.round(furC[1] * (1 - tb) + bg * tb)
      underlay[di + 2] = Math.round(furC[2] * (1 - tb) + bb * tb)
      underlay[di + 3] = Math.max(underlay[di + 3], alpha)
    }
  }
}

const png8 = (raw) => sharp(raw, { raw: { width: STRIP.w, height: STRIP.h, channels: 4 } })
  .png({ palette: true, colors: 256, dither: 1, compressionLevel: 9 })
  .toBuffer()

const eyesOut = await png8(eyes)
const underlayOut = await png8(underlay)
await writeFile(path.join(outDir, 'xiaoduoli-sit-eyes-v1.png'), eyesOut)
await writeFile(path.join(outDir, 'xiaoduoli-sit-underlay-v1.png'), underlayOut)
console.log(`[strip] ${JSON.stringify(STRIP)} pivotY(画布)=${(EYES.reduce((s, e) => s + e.rect.y + e.rect.h / 2, 0) / EYES.length).toFixed(1)}`)
console.log(`[out] xiaoduoli-sit-eyes-v1.png ${(eyesOut.length / 1024).toFixed(1)}KB / xiaoduoli-sit-underlay-v1.png ${(underlayOut.length / 1024).toFixed(1)}KB`)

// ---------- 自检拼图：整机 mock（底图 + 两层按定位叠放；眨眼帧眼组压到 8% 高贴支点） ----------
// 纯 sharp composite，不做手工像素搬运——mock 只验证素材本身的观感与定位
const putScale = 2
const fullW = CANVAS.width * putScale
const fullH = CANVAS.height * putScale
const pivotCanvasY = (EYES.reduce((s, e) => s + e.rect.y + e.rect.h / 2, 0) / EYES.length) * putScale
const layerAt = async (raw, squash) => {
  const h = squash ? Math.max(1, Math.round(STRIP.h * putScale * 0.08)) : STRIP.h * putScale
  const resized = await sharp(raw, { raw: { width: STRIP.w, height: STRIP.h, channels: 4 } })
    .resize({ width: STRIP.w * putScale, height: h, fit: 'fill', kernel: 'lanczos3' })
    .png().toBuffer()
  const top = squash
    ? Math.round(pivotCanvasY - h / 2) // composite 的 top 是全画布绝对坐标：压扁带贴双眼支点线
    : STRIP.y * putScale
  return { input: resized, left: STRIP.x * putScale, top }
}
const composeFull = async (squash) => sharp(srcPath).resize({ width: fullW, height: fullH, fit: 'fill', kernel: 'lanczos3' })
  .composite([
    await layerAt(underlay, false),
    await layerAt(eyes, squash),
  ])
  .png().toBuffer()
await writeFile(path.join(import.meta.dirname, 'tmp-sit-blink-idle.png'), await composeFull(false))
await writeFile(path.join(import.meta.dirname, 'tmp-sit-blink-closed.png'), await composeFull(true))
console.log('[mock] tmp-sit-blink-idle.png / tmp-sit-blink-closed.png（整机 2x 自检）')
