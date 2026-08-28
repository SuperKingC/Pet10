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
})
