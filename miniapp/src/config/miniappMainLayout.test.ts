import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '..')

describe('miniapp main layout', () => {
  it('uses the nest title and a neutral loading placeholder without the room background flash', () => {
    const pageSource = fs.readFileSync(path.join(root, 'pages', 'index', 'index.tsx'), 'utf8')
    const nestSource = fs.readFileSync(path.join(root, 'features', 'main', 'MiniappNestView.tsx'), 'utf8')
    const nestStyles = fs.readFileSync(path.join(root, 'features', 'main', 'MiniappNestView.scss'), 'utf8')

    expect(pageSource).not.toContain('className="page-heading"')
    expect(nestSource).toContain('记录你们和小多利的共同生活。')
    expect(nestSource).toContain('className="miniapp-nest__loading"')
    expect(nestSource).not.toContain("require('../../assets/room-background.jpg')")
    expect(nestSource).not.toContain('style={{ backgroundImage')
    expect(nestSource).not.toContain('小多利正在赶来')
    expect(nestSource).not.toContain('邀请一位好友，建立属于你们的共同小窝。')
    expect(nestStyles).toMatch(/\.miniapp-nest__loading\s*\{[\s\S]*width:\s*100%;/)
    expect(nestStyles).toMatch(/\.miniapp-nest__loading\s*\{[\s\S]*height:\s*560rpx;/)
    expect(nestStyles).toMatch(/\.miniapp-nest__loading\s*\{[\s\S]*background:\s*#fff8ee;/)
  })

  it('makes nest shortcuts and profile list icons easier to see', () => {
    const nestStyles = fs.readFileSync(path.join(root, 'features', 'main', 'MiniappNestView.scss'), 'utf8')
    const meStyles = fs.readFileSync(path.join(root, 'features', 'main', 'MiniappMeView.scss'), 'utf8')

    expect(nestStyles).toMatch(/\.miniapp-nest__scene\s*\{[\s\S]*position:\s*relative;/)
    expect(nestStyles).toMatch(/\.miniapp-nest__shortcuts\s*\{[\s\S]*position:\s*absolute;/)
    expect(nestStyles).toMatch(/\.miniapp-nest__shortcuts\s*\{[\s\S]*right:\s*4px;/)
    expect(nestStyles).toMatch(/\.miniapp-nest__shortcuts\s*\{[\s\S]*flex-direction:\s*column;/)
    expect(nestStyles).toMatch(/\.miniapp-nest__shortcuts\s*\{[\s\S]*gap:\s*16px;/)
    expect(nestStyles).toMatch(/\.miniapp-nest__shortcut\s*\{[\s\S]*width:\s*128px;/)
    expect(nestStyles).toMatch(/\.miniapp-nest__shortcut image\s*\{[\s\S]*width:\s*128px;/)
    expect(nestStyles).toMatch(/\.miniapp-nest__shortcut image\s*\{[\s\S]*height:\s*133px;/)
    expect(meStyles).toMatch(/\.miniapp-me__item image,[\s\S]*\.miniapp-me__logout image\s*\{[\s\S]*width:\s*76rpx;/)
    expect(meStyles).toMatch(/\.miniapp-me__item image,[\s\S]*\.miniapp-me__logout image\s*\{[\s\S]*height:\s*76rpx;/)
  })

  it('uses the same title geometry across all main tabs', () => {
    const sources = [
      fs.readFileSync(path.join(root, 'features', 'main', 'MiniappNestView.tsx'), 'utf8'),
      fs.readFileSync(path.join(root, 'features', 'main', 'MiniappJournalView.tsx'), 'utf8'),
      fs.readFileSync(path.join(root, 'features', 'main', 'MiniappMessagesView.tsx'), 'utf8'),
      fs.readFileSync(path.join(root, 'features', 'main', 'MiniappMeView.tsx'), 'utf8'),
    ]
    const indexStyles = fs.readFileSync(path.join(root, 'pages', 'index', 'index.scss'), 'utf8')

    for (const source of sources) {
      expect(source).toContain('miniapp-page-header')
      expect(source).toContain('miniapp-page-title')
    }
    expect(sources[0]).toContain('miniapp-page-caption')
    expect(sources[2]).toContain('miniapp-page-caption')
    expect(sources[3]).toContain('miniapp-page-caption')
    expect(indexStyles).toMatch(/\.miniapp-page-header\s*\{[\s\S]*padding:\s*2px 2px 4px;/)
    expect(indexStyles).toMatch(/\.miniapp-page-title\s*\{[\s\S]*font-size:\s*var\(--font-size-page-title\);[\s\S]*font-weight:\s*var\(--font-weight-bold\);/)
  })

  it('loads backgrounds from compiled assets instead of runtime inline styles', () => {
    const tabSource = fs.readFileSync(path.join(root, 'components', 'MiniappTabBar.tsx'), 'utf8')
    const tabStyles = fs.readFileSync(path.join(root, 'components', 'MiniappTabBar.scss'), 'utf8')

    expect(tabSource).not.toContain('style={{ backgroundImage')
    expect(tabStyles).toContain("url('../assets/navigation/tab-bar-background.png')")
  })

  it('keeps the page shell and bottom safe area on one background color', () => {
    const indexStyles = fs.readFileSync(path.join(root, 'pages', 'index', 'index.scss'), 'utf8')
    const tabStyles = fs.readFileSync(path.join(root, 'components', 'MiniappTabBar.scss'), 'utf8')

    expect(indexStyles).toMatch(/\.home-page\s*\{[\s\S]*background:\s*#fff8ee;/)
    expect(indexStyles).toMatch(/\.home-page\s*\{[\s\S]*padding:\s*4px 32px 220px;/)
    expect(tabStyles).toMatch(/\.miniapp-tab-bar\s*\{[\s\S]*background:\s*#fff8ee;/)
  })
})
