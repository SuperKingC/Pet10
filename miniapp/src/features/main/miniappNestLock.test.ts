import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { shouldLockNestPageScroll } from './miniappViewModel'

const nestViewPath = path.resolve(__dirname, 'MiniappNestView.tsx')
const nestViewStylesPath = path.resolve(__dirname, 'MiniappNestView.scss')

describe('nest lock scene presentation', () => {
  it('locks page scroll only for the letter scene modes (locked/empty)', () => {
    expect(shouldLockNestPageScroll('locked')).toBe(true)
    expect(shouldLockNestPageScroll('empty')).toBe(true)
    expect(shouldLockNestPageScroll('loading')).toBe(false)
    expect(shouldLockNestPageScroll('active')).toBe(false)
  })

  it('renders the letter scene in a fixed full-screen layer that scrolls internally', () => {
    const component = fs.readFileSync(nestViewPath, 'utf8')
    const styles = fs.readFileSync(nestViewStylesPath, 'utf8')

    // 信件场景独立成固定层：页面文档流不再被信纸 + 街景撑高，真机整页不可拖动
    expect(component).toContain('shouldLockNestPageScroll')
    expect(component).toContain('nest-lock-layer')
    expect(styles).toMatch(/\.nest-lock-layer \{[^}]*position: fixed;/)
    expect(styles).toMatch(/\.nest-lock-layer \{[^}]*inset: 0;/)
    expect(styles).toMatch(/\.nest-lock-layer \{[^}]*overflow-y: auto;/)
    expect(styles).toMatch(/\.nest-lock-layer \{[^}]*background: #fff8ee;/)
  })

  it('keeps the page-level scroll for loading and active nest modes', () => {
    const component = fs.readFileSync(nestViewPath, 'utf8')

    // 非锁定模式仍走文档流容器，保持消息/日历/我的与加载、活跃态的既有滚动行为
    expect(component).toContain('"miniapp-nest"')
  })
})
