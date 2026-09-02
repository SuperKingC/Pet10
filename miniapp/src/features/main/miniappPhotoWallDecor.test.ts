import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// 照片墙装饰契约：整串彩灯成图/图钉/和纸胶带贴图（AI 生成 → make-photo-wall-decor.mjs 去底出件）。
// 断言组件真的引用三色图钉与三款胶带循环、灯串是单张整串成图+一层暖光呼吸（无逐灯拆件逻辑）。
const componentPath = path.resolve(__dirname, 'MiniappPhotoWallPanel.tsx')
const stylesPath = path.resolve(__dirname, 'MiniappPhotoWallPanel.scss')
const decorDir = path.resolve(__dirname, '../../assets/decor')

const DECOR_FILES = [
  'photo-wall-lights-v4.png',
  'photo-wall-pin-red-v2.png',
  'photo-wall-pin-yellow-v2.png',
  'photo-wall-pin-blue-v2.png',
  'photo-wall-tape-dots-v1.png',
  'photo-wall-tape-stripes-v1.png',
  'photo-wall-tape-green-v1.png'
]

describe('photo wall decor presentation', () => {
  it('renders the garland as one full-string image with no per-bulb sprite logic', () => {
    const component = fs.readFileSync(componentPath, 'utf8')
    expect(component).toContain('photo-wall-lights-v4.png')
    expect(component).toContain('photo-wall-lights__string')
    // 拆件逻辑全部移除：无精灵图集、无位置清单、无逐灯循环
    expect(component).not.toContain('photo-wall-bulb')
    expect(component).not.toContain('PHOTO_WALL_BULBS')
    expect(component).not.toContain('photoWallLightsBulbs')
    expect(fs.existsSync(path.resolve(__dirname, 'photoWallLightsBulbs.ts'))).toBe(false)
    expect(fs.existsSync(path.join(decorDir, 'photo-wall-bulbs-v3.png'))).toBe(false)
  })

  it('cycles three pin colors and three washi tape variants across cards', () => {
    const component = fs.readFileSync(componentPath, 'utf8')
    // 图钉 v2：正面视角圆头（v1 侧面吊针像立着的，按反馈重生成）
    for (const color of ['red', 'yellow', 'blue']) {
      expect(component).toContain(`photo-wall-pin-${color}-v2.png`)
    }
    for (const tape of ['dots', 'stripes', 'green']) {
      expect(component).toContain(`photo-wall-tape-${tape}-v1.png`)
    }
    expect(component).toContain('src={pinDecor[index % 3]}')
    expect(component).toContain('TAPE_VARIANTS[index % 3]')
  })

  it('fixes the string height so the panel does not flash before the image loads', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')
    // widthFix 未加载前按默认尺寸渲染会闪跳；定高 88rpx ≈ 640×82 成图按 686 盒宽等比
    expect(styles).toMatch(/\.photo-wall-lights__string \{[^}]*height: 88rpx;/)
  })

  it('breathes as a whole string with a single warm glow layer and reduced-motion fallback', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')
    // 整串一层暖光呼吸：只调透明度不缩放；reduced-motion 静止常亮
    expect(styles).toMatch(/\.photo-wall-lights__glow \{[^}]*animation: photo-wall-lights-glow/)
    expect(styles).toMatch(/@keyframes photo-wall-lights-glow/)
    expect(styles).not.toContain('photo-wall-bulb')
    expect(styles).not.toContain('photo-wall-bulb-twinkle')
    expect(styles).not.toContain('photo-wall-bulb-flicker')
    expect(styles).toMatch(/\.photo-wall-lights__glow \{ animation: none; opacity: \.6; \}/)
  })

  it('sizes the pin and tape decorations to their baked-shadow assets', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')
    expect(styles).toMatch(/\.photo-wall-card__pin \{[^}]*width: 44rpx;[^}]*height: 47rpx;/)
    expect(styles).toMatch(/\.photo-wall-card__tape \{[^}]*width: 164rpx;/)
    expect(styles).toMatch(/\.photo-wall-card__tape--dots \{ height: 31rpx; \}/)
    expect(styles).toMatch(/\.photo-wall-card__tape--stripes \{ height: 28rpx; \}/)
    expect(styles).toMatch(/\.photo-wall-card__tape--green \{ height: 29rpx; \}/)
  })

  it('adds the warm light pool and bottom vignette to the cork panel', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')
    expect(styles).toContain('rgba(255, 216, 150, .2)')
    expect(styles).toContain('rgba(84, 55, 28, .16)')
  })

  it('ships all seven decor assets within the image budget', () => {
    for (const file of DECOR_FILES) {
      const bytes = fs.statSync(path.join(decorDir, file)).size
      expect(bytes).toBeGreaterThan(1024)
      expect(bytes).toBeLessThan(180 * 1024)
    }
  })
})
