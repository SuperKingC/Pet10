import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// 小记/消息/我的三个 tab 与游戏中心、锁定信件场景同模式：根节点是固定全屏层，
// 页面文档流高度归零、真机整页不可拖动；内容超一屏时由层内 overflow-y 兜底滚动。
const tabLayerRoots = [
  { file: 'MiniappMessagesView.scss', root: '.miniapp-messages' },
  { file: 'MiniappJournalView.scss', root: '.miniapp-journal' },
  { file: 'MiniappMeView.scss', root: '.miniapp-me' },
]

describe('tab content fixed layers', () => {
  it.each(tabLayerRoots)('renders $root as a fixed full-screen layer that scrolls internally', ({ file, root }) => {
    const styles = fs.readFileSync(path.resolve(__dirname, file), 'utf8')

    expect(styles).toMatch(new RegExp(`${root} \\{[^}]*position: fixed;`))
    expect(styles).toMatch(new RegExp(`${root} \\{[^}]*inset: 0;`))
    expect(styles).toMatch(new RegExp(`${root} \\{[^}]*z-index: 19;`))
    expect(styles).toMatch(new RegExp(`${root} \\{[^}]*overflow-y: auto;`))
  })

  it('keeps the layers below the fixed tab bar and overlay stack', () => {
    const tabBarStyles = fs.readFileSync(path.resolve(__dirname, '../../components/MiniappTabBar.scss'), 'utf8')
    expect(tabBarStyles).toMatch(/\.miniapp-tab-bar \{[^}]*z-index: 20;/)
  })

  it('raises the journal layer above the paw menu while one of its full-screen overlays is open', () => {
    // 小记根节点 z-index 19 形成层级上下文，内部写日记/运势覆盖层被封在 19 层，
    // 会被爪印菜单（z-index 30）压住底部；覆盖层打开时根节点加修饰类抬到 41 层。
    // 纪念日已改为页内分页 tab（不再走覆盖层），只有写日记与运势还抬层
    const styles = fs.readFileSync(path.resolve(__dirname, 'MiniappJournalView.scss'), 'utf8')
    const pawMenuStyles = fs.readFileSync(path.resolve(__dirname, 'MiniappPawMenu.scss'), 'utf8')
    const view = fs.readFileSync(path.resolve(__dirname, 'MiniappJournalView.tsx'), 'utf8')

    expect(pawMenuStyles).toMatch(/\.miniapp-paw-menu \{[^}]*z-index: 30;/)
    expect(styles).toMatch(/\.miniapp-journal--overlay-open \{[^}]*z-index: 41;/)
    expect(view).toMatch(/editor !== null \|\| fortuneOverlayOpen/)
    expect(view).toMatch(/overlayOpen \? 'miniapp-journal miniapp-journal--overlay-open' : 'miniapp-journal'/)
  })
})
