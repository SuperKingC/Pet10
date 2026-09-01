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
    // tab 页标题下的介绍文案已整体去掉，页面内容上移
    expect(nestSource).not.toContain('记录你们和小多利的共同生活')
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
    // 快捷入口整列收进 439px 场景内，不再垂直居中溢出到卡片下方
    expect(nestStyles).toMatch(/\.miniapp-nest__shortcuts\s*\{[\s\S]*position:\s*absolute;/)
    expect(nestStyles).toMatch(/\.miniapp-nest__shortcuts\s*\{[\s\S]*top:\s*84px;/)
    expect(nestStyles).toMatch(/\.miniapp-nest__shortcuts\s*\{[\s\S]*right:\s*8px;/)
    expect(nestStyles).toMatch(/\.miniapp-nest__shortcuts\s*\{[\s\S]*flex-direction:\s*column;/)
    expect(nestStyles).toMatch(/\.miniapp-nest__shortcuts\s*\{[\s\S]*gap:\s*16px;/)
    expect(nestStyles).toMatch(/\.miniapp-nest__shortcut\s*\{[\s\S]*width:\s*92px;/)
    expect(nestStyles).toMatch(/\.miniapp-nest__shortcut image\s*\{[\s\S]*width:\s*92px;/)
    expect(nestStyles).toMatch(/\.miniapp-nest__shortcut image\s*\{[\s\S]*height:\s*96px;/)
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
      // 四个 tab 页均已去掉标题下介绍文案
      expect(source).not.toContain('miniapp-page-caption')
    }
    expect(indexStyles).toMatch(/\.miniapp-page-header\s*\{[\s\S]*padding:\s*2px 2px 0;/)
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
    // 小窝文档流层底部 234px + 末张卡 8rpx 下边距 = 与固定 tab 层统一的 238px 净空
    expect(indexStyles).toMatch(/\.home-page\s*\{[\s\S]*padding:\s*0 32px 234px;/)
    expect(tabStyles).toMatch(/\.miniapp-tab-bar\s*\{[\s\S]*background:\s*#fff8ee;/)
  })

  it('drops the outfit match card and opens the pet card modal from the scene', () => {
    const nestSource = fs.readFileSync(path.join(root, 'features', 'main', 'MiniappNestView.tsx'), 'utf8')
    const petCardSource = fs.readFileSync(path.join(root, 'features', 'main', 'MiniappPetCardModal.tsx'), 'utf8')
    const statusCardSource = fs.readFileSync(path.join(root, 'components', 'PetStatusCard.tsx'), 'utf8')
    const statusCardStyles = fs.readFileSync(path.join(root, 'components', 'PetStatusCard.scss'), 'utf8')

    // 今日默契换装栏从小窝移除（入口收进衣柜面板），名片弹窗接在场景名牌上
    expect(nestSource).not.toContain('MiniappOutfitMatchCard')
    expect(nestSource).toContain('MiniappPetCardModal')
    expect(petCardSource).toContain("const PET_CARD_FILE = 'pet-card-v1.jpg'")
    expect(statusCardSource).toContain('onOpenCard')
    expect(statusCardSource).toContain('pet-name-card')
    // 背景 v5 横构图（窗/牌/架/地毯全部在画内，地毯缩为中心椭圆）aspectFill 定高填充；场景 439px；状态条加粗 16rpx
    expect(statusCardSource).toContain('mode="aspectFill"')
    expect(statusCardSource).toContain("require('../assets/room-background-v5.jpg')")
    expect(statusCardSource).toContain('xiaoduoliDanmaku')
    expect(statusCardSource).toContain('pet-danmaku')
    expect(statusCardStyles).toMatch(/\.pet-card-scene\s*\{[\s\S]*height:\s*439px;/)
    expect(statusCardStyles).toMatch(/\.pet-card-background\s*\{[\s\S]*height:\s*100%;/)
    expect(statusCardStyles).toMatch(/\.experience-track,\s*\.status-track\s*\{[\s\S]*height:\s*16rpx;/)
  })
})
