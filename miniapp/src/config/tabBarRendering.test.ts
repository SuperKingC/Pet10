import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '..')

describe('miniapp tab bar rendering', () => {
  it('keeps the background static and disables image fade-in', () => {
    const source = fs.readFileSync(path.join(root, 'components', 'MiniappTabBar.tsx'), 'utf8')
    const styles = fs.readFileSync(path.join(root, 'components', 'MiniappTabBar.scss'), 'utf8')

    expect(source).toContain('className="miniapp-tab-bar__background"')
    expect(styles).toContain('background-image')
    expect(source).not.toContain('src={tabBarBackground}')
  })

  it('centers the paw circle inside the background arc with an even gap', () => {
    const styles = fs.readFileSync(path.join(root, 'components', 'MiniappTabBar.scss'), 'utf8')

    expect(styles).toMatch(/\.miniapp-tab__paw\s*\{[\s\S]*bottom:\s*14rpx;/)
    expect(styles).toMatch(/\.miniapp-tab__paw\s*\{[\s\S]*width:\s*116rpx;/)
    expect(styles).toMatch(/\.miniapp-tab__paw\s*\{[\s\S]*height:\s*116rpx;/)
    expect(styles).toMatch(/\.miniapp-tab__paw\s*\{[\s\S]*background:\s*#fff9e9;/)
    expect(styles).toMatch(/\.miniapp-tab__paw\s*\{[\s\S]*left:\s*calc\(50% - 4rpx\);/)
  })

  it('enlarges the selected tab icon without a transition', () => {
    const styles = fs.readFileSync(path.join(root, 'components', 'MiniappTabBar.scss'), 'utf8')

    expect(styles).toMatch(/\.miniapp-tab--active \.miniapp-tab__icon\s*\{[\s\S]*transform:\s*scale\(1\.12\);/)
    expect(styles).not.toMatch(/\.miniapp-tab--active \.miniapp-tab__icon\s*\{[\s\S]*transition:/)
  })

  it('hides the tab bar while the fullscreen chat page is open', () => {
    const source = fs.readFileSync(path.join(root, 'components', 'MiniappTabBar.tsx'), 'utf8')
    const pageSource = fs.readFileSync(path.join(root, 'pages', 'index', 'index.tsx'), 'utf8')
    const messagesSource = fs.readFileSync(path.join(root, 'features', 'main', 'MiniappMessagesView.tsx'), 'utf8')

    // tab 栏支持 hidden 隐藏（直接不渲染），页面在聊天页打开时传入
    expect(source).toMatch(/hidden\s*[?:]/)
    expect(source).toContain('if (hidden) return null')
    expect(pageSource).toContain('hidden={activeTab === \'messages\' && Boolean(chatRoomId)}')
    // 消息视图把聊天页开关上报给页面
    expect(messagesSource).toContain('onChatOpenChange?.(openRoomId)')
    expect(pageSource).toContain('onChatOpenChange={setChatRoomId}')
  })
})
