import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '..')

describe('miniapp main layout', () => {
  it('uses the nest title and an empty room background without invitation copy', () => {
    const pageSource = fs.readFileSync(path.join(root, 'pages', 'index', 'index.tsx'), 'utf8')
    const nestSource = fs.readFileSync(path.join(root, 'features', 'main', 'MiniappNestView.tsx'), 'utf8')
    const nestStyles = fs.readFileSync(path.join(root, 'features', 'main', 'MiniappNestView.scss'), 'utf8')

    expect(pageSource).not.toContain('className="page-heading"')
    expect(nestSource).toContain("require('../../assets/room-background.webp')")
    expect(nestSource).toContain('记录你们和小多利的共同生活。')
    expect(nestSource).toContain('className="miniapp-nest__empty"')
    expect(nestSource).toContain('backgroundImage')
    expect(nestSource).not.toContain('小多利正在赶来')
    expect(nestSource).not.toContain('邀请一位好友，建立属于你们的共同小窝。')
    expect(nestStyles).toMatch(/\.miniapp-nest__empty\s*\{[\s\S]*background-position:\s*center 68%;/)
    expect(nestStyles).toMatch(/\.miniapp-nest__empty\s*\{[\s\S]*background-size:\s*cover;/)
  })

  it('makes nest shortcuts and profile list icons easier to see', () => {
    const nestStyles = fs.readFileSync(path.join(root, 'features', 'main', 'MiniappNestView.scss'), 'utf8')
    const meStyles = fs.readFileSync(path.join(root, 'features', 'main', 'MiniappMeView.scss'), 'utf8')

    expect(nestStyles).toMatch(/\.miniapp-nest__scene\s*\{[\s\S]*position:\s*relative;/)
    expect(nestStyles).toMatch(/\.miniapp-nest__shortcuts\s*\{[\s\S]*position:\s*absolute;/)
    expect(nestStyles).toMatch(/\.miniapp-nest__shortcuts\s*\{[\s\S]*right:\s*4px;/)
    expect(nestStyles).toMatch(/\.miniapp-nest__shortcuts\s*\{[\s\S]*flex-direction:\s*column;/)
    expect(nestStyles).toMatch(/\.miniapp-nest__shortcut\s*\{[\s\S]*width:\s*100px;/)
    expect(nestStyles).toMatch(/\.miniapp-nest__shortcut image\s*\{[\s\S]*width:\s*100px;/)
    expect(nestStyles).toMatch(/\.miniapp-nest__shortcut image\s*\{[\s\S]*height:\s*104px;/)
    expect(meStyles).toMatch(/\.miniapp-me__item image,[\s\S]*\.miniapp-me__logout image\s*\{[\s\S]*width:\s*76rpx;/)
    expect(meStyles).toMatch(/\.miniapp-me__item image,[\s\S]*\.miniapp-me__logout image\s*\{[\s\S]*height:\s*76rpx;/)
  })
})
