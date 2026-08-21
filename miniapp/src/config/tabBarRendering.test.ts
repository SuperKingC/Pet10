import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '..')

describe('miniapp tab bar rendering', () => {
  it('keeps the background static and disables image fade-in', () => {
    const source = fs.readFileSync(path.join(root, 'components', 'MiniappTabBar.tsx'), 'utf8')

    expect(source).toContain('memo(function MiniappTabBarBackground')
    expect(source).toContain('fadeIn={false}')
  })

  it('centers the paw circle inside the background arc with an even gap', () => {
    const styles = fs.readFileSync(path.join(root, 'components', 'MiniappTabBar.scss'), 'utf8')

    expect(styles).toMatch(/\.miniapp-tab__paw\s*\{[\s\S]*bottom:\s*22rpx;/)
    expect(styles).toMatch(/\.miniapp-tab__paw\s*\{[\s\S]*width:\s*116rpx;/)
    expect(styles).toMatch(/\.miniapp-tab__paw\s*\{[\s\S]*height:\s*116rpx;/)
  })
})
