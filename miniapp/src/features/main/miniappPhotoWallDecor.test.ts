import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// 照片墙装饰契约：实拍质感彩灯串/图钉/和纸胶带贴图（AI 生成 → make-photo-wall-decor.mjs 去底出件）。
// 断言组件真的引用三色图钉与三款胶带循环、灯串替换掉旧 CSS 色块灯泡，样式带呼吸降级。
const componentPath = path.resolve(__dirname, 'MiniappPhotoWallPanel.tsx')
const stylesPath = path.resolve(__dirname, 'MiniappPhotoWallPanel.scss')
const decorDir = path.resolve(__dirname, '../../assets/decor')

const DECOR_FILES = [
  'photo-wall-lights-v1.png',
  'photo-wall-bulbs-v1.png',
  'photo-wall-pin-red-v1.png',
  'photo-wall-pin-yellow-v1.png',
  'photo-wall-pin-blue-v1.png',
  'photo-wall-tape-dots-v1.png',
  'photo-wall-tape-stripes-v1.png',
  'photo-wall-tape-green-v1.png'
]

describe('photo wall decor presentation', () => {
  it('renders the realistic light string instead of CSS bulb blocks', () => {
    const component = fs.readFileSync(componentPath, 'utf8')
    expect(component).toContain('photo-wall-lights-v1.png')
    expect(component).toContain('photo-wall-lights__string')
    expect(component).not.toContain('photo-wall-lights__bulb')
  })

  it('cycles three pin colors and three washi tape variants across cards', () => {
    const component = fs.readFileSync(componentPath, 'utf8')
    for (const file of ['pin-red', 'pin-yellow', 'pin-blue', 'tape-dots', 'tape-stripes', 'tape-green']) {
      expect(component).toContain(`photo-wall-${file}-v1.png`)
    }
    expect(component).toContain('src={pinDecor[index % 3]}')
    expect(component).toContain('TAPE_VARIANTS[index % 3]')
  })

  it('fixes the string height so the panel does not flash before the image loads', () => {
    const component = fs.readFileSync(componentPath, 'utf8')
    const styles = fs.readFileSync(stylesPath, 'utf8')
    // widthFix 未加载前按默认尺寸渲染会闪跳；定高 686×64 ≈ 电线底图 640×60 等比
    expect(styles).toMatch(/\.photo-wall-lights__string \{[^}]*height: 64rpx;/)
    expect(component).not.toContain('photo-wall-lights__string" src={lightsString} mode="widthFix"')
  })

  it('twinkles each bulb independently with random-ish phases instead of a sweeping strip', () => {
    const component = fs.readFileSync(componentPath, 'utf8')
    const styles = fs.readFileSync(stylesPath, 'utf8')
    const manifest = fs.readFileSync(path.resolve(__dirname, 'photoWallLightsBulbs.ts'), 'utf8')

    // 灯泡精灵逐颗叠加，位置与随机参数来自生成的清单
    expect(component).toContain('PHOTO_WALL_BULBS.map')
    expect(component).toContain('photo-wall-bulb--cell-${bulb.cell}')
    expect(component).toContain('animationDelay')
    expect(manifest.match(/"cell":/g)?.length).toBeGreaterThanOrEqual(10)
    // 精灵图集经 SCSS 内联，10 格背景定位；两种闪烁节奏交错
    expect(styles).toMatch(/\.photo-wall-bulb \{[^}]*background-image: url\('\.\.\/\.\.\/assets\/decor\/photo-wall-bulbs-v1\.png'\)/)
    expect(styles).toMatch(/\.photo-wall-bulb \{[^}]*background-size: 1000% 100%;/)
    expect(styles).toMatch(/@keyframes photo-wall-bulb-twinkle/)
    expect(styles).toMatch(/@keyframes photo-wall-bulb-flicker/)
    expect(styles).not.toContain('photo-wall-sweep')
    expect(styles).toMatch(/\.photo-wall-bulb \{ animation: none; opacity: 1; \}/)
  })

  it('sizes the pin and tape decorations to their baked-shadow assets', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')
    expect(styles).toMatch(/\.photo-wall-card__pin \{[^}]*width: 42rpx;[^}]*height: 49rpx;/)
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
