import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const modalComponentPath = path.resolve(__dirname, '../../components/MiniappModal.tsx')
const modalStylesPath = path.resolve(__dirname, '../../components/MiniappModal.scss')
const pawMenuStylesPath = path.resolve(__dirname, 'MiniappPawMenu.scss')
const pawMenuPath = path.resolve(__dirname, 'MiniappPawMenu.tsx')
const gamesModalPath = path.resolve(__dirname, 'MiniappGamesModal.tsx')
const meViewPath = path.resolve(__dirname, 'MiniappMeView.tsx')
const mbtiPath = path.resolve(__dirname, 'MiniappMbtiTest.tsx')
const avatarEditorPath = path.resolve(__dirname, 'MiniappAvatarEditor.tsx')
const memoryPanelPath = path.resolve(__dirname, 'MiniappMemoryPanel.tsx')
const codewordModalPath = path.resolve(__dirname, 'MiniappCodewordModal.tsx')
const tarotFlowStylesPath = path.resolve(__dirname, '../tarot/MiniappTarotFlow.scss')

describe('miniapp ui presentation rules', () => {
  it('provides a shared centered modal with an image close button in the top-right corner', () => {
    const component = fs.readFileSync(modalComponentPath, 'utf8')
    const styles = fs.readFileSync(modalStylesPath, 'utf8')

    expect(component).toContain('MiniappModal')
    expect(component).toContain('miniapp-modal__close')
    expect(component).toContain('modal-close.png')
    expect(styles).toContain('.miniapp-modal {')
    expect(styles).toContain('align-items: center;')
    expect(styles).toContain('.miniapp-modal__close {')
    expect(styles).toContain('top: 24rpx;')
    expect(styles).toContain('right: 24rpx;')
    expect(styles).not.toMatch(/\.miniapp-modal__panel[^{]*\{[^}]*inset: auto 0 0/)
  })

  it('keeps the paw print quick menu as the only allowed bottom drawer', () => {
    const styles = fs.readFileSync(pawMenuStylesPath, 'utf8')

    expect(styles).toMatch(/\.miniapp-paw-menu__sheet/)
  })

  it('presents MBTI, contact, about and avatar editing through the shared modal', () => {
    expect(fs.readFileSync(mbtiPath, 'utf8')).toContain('<MiniappModal')
    const meView = fs.readFileSync(meViewPath, 'utf8')
    expect(meView).toContain('<MiniappModal')
    expect(meView).toContain('联系我们')
    expect(meView).toContain('关于小多利')
    expect(meView).toContain('setAboutOpen(true)')
    expect(meView).toContain('仅此一只')
    expect(meView).toContain('老实巴交')
    expect(meView).toContain('等妈妈回家')
    expect(meView).toContain('miniapp-about__version')
    expect(fs.readFileSync(avatarEditorPath, 'utf8')).toContain('<MiniappModal')
    expect(fs.readFileSync(memoryPanelPath, 'utf8')).toContain('<MiniappModal')
  })

  it('right-aligns the about modal version line', () => {
    const styles = fs.readFileSync(path.resolve(__dirname, 'MiniappMeView.scss'), 'utf8')
    expect(styles).toContain('.miniapp-about__version {')
    expect(styles).toMatch(/\.miniapp-about__version \{[^}]*text-align: right;/)
  })

  it('presents the games hub through the shared modal with gobang and a coming-soon hint', () => {
    const gamesModal = fs.readFileSync(gamesModalPath, 'utf8')

    expect(gamesModal).toContain('<MiniappModal')
    expect(gamesModal).toContain('五子棋')
    expect(gamesModal).toContain('gobang.png')
    expect(gamesModal).toContain('敬请期待')
  })

  it('shows codeword, game and tarot icon entries in the paw menu and removes the footprint map entry', () => {
    const menu = fs.readFileSync(pawMenuPath, 'utf8')

    expect(menu).toContain('codeword.png')
    expect(menu).toContain('game.png')
    expect(menu).toContain('tarot.png')
    expect(menu).toContain('onOpenCodeword(): void')
    expect(menu).toContain('onOpenGames(): void')
    expect(menu).not.toContain('足迹地图')
    expect(menu).not.toContain('onOpenMap')
    expect(menu).not.toContain('entry-caption')
  })

  it('uses a hand-painted MBTI icon in the personal settings list', () => {
    const meView = fs.readFileSync(meViewPath, 'utf8')

    expect(meView).toContain('mbti.png')
    expect(meView).not.toContain('miniapp-me__mbti-icon')
  })

  it('presents the daily codeword through the shared centered modal', () => {
    const modal = fs.readFileSync(codewordModalPath, 'utf8')

    expect(modal).toContain('<MiniappModal')
    expect(modal).toContain('每日暗号')
    expect(modal).toContain('answerCodeword')
  })

  it('keeps tarot history as a centered themed panel instead of a bottom drawer', () => {
    const styles = fs.readFileSync(tarotFlowStylesPath, 'utf8')

    expect(styles).toContain('.miniapp-tarot-history__panel')
    expect(styles).not.toContain('miniapp-tarot-history__sheet')
  })
})
