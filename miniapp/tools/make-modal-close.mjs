// 重新生成弹窗关闭叉叉图标：SVG 矢量绘制 → sharp 出件 192×192 PNG。
// v2 起去掉外面的圆圈描边，只保留圆角 X 叉本体（暖橙填充 + 深棕描边 + 左上高光），
// 与原 v1 的 X 画法同语言；透明底。文件名带版本号：同路径图片会被开发者工具缓存供旧图。
// 运行：node miniapp/tools/make-modal-close.mjs
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const outDir = path.resolve(import.meta.dirname, '../src/assets/common')
await mkdir(outDir, { recursive: true })

// 采样自 modal-close.png 的实测色板
const STROKE = '#3a2417'
const ORANGE = '#e27454'

// 画布 192×192，X 居中：旋转 45° 的圆角方块减去四角，用圆角粗线两笔交叉更简单——
// 两条 45° 圆头粗线（长 112、宽 34）交叠出 X，外层深棕描边 + 内层橙色填充 + 左上白高光弧
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <g transform="rotate(45 96 96)">
    <rect x="40" y="79" width="112" height="34" rx="17" fill="${STROKE}"/>
    <rect y="79" x="40" width="112" height="34" rx="17" fill="${STROKE}" transform="rotate(90 96 96)"/>
    <rect x="45" y="83" width="102" height="26" rx="13" fill="${ORANGE}"/>
    <rect y="83" x="45" width="102" height="26" rx="13" fill="${ORANGE}" transform="rotate(90 96 96)"/>
    <rect x="52" y="86" width="88" height="7" rx="3.5" fill="#f7a58a" opacity=".8"/>
    <rect y="99" x="52" width="88" height="7" rx="3.5" fill="#c85e42" opacity=".55" transform="rotate(90 96 96)"/>
  </g>
</svg>`

const png = await sharp(Buffer.from(svg)).png().toBuffer()
await writeFile(path.join(outDir, 'modal-close-v2.png'), png)
console.log('modal-close-v2.png', (png.length / 1024).toFixed(1) + 'KB')
