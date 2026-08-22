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
})
