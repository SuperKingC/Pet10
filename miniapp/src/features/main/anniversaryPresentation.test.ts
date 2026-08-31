import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const formPath = path.resolve(__dirname, 'AnniversaryForm.tsx')
const listPath = path.resolve(__dirname, 'AnniversaryListView.tsx')
const stylesPath = path.resolve(__dirname, 'anniversary.scss')
const panelStylesPath = path.resolve(__dirname, 'JournalAnniversaryPanel.scss')

describe('anniversary photo presentation rules', () => {
  it('compresses the chosen photo once through the services layer without lowering quality', () => {
    const form = fs.readFileSync(formPath, 'utf8')

    expect(form).toContain("from '../../services/imageCompression'")
    expect(form).toContain('compressImageToDataUrl')
    expect(form).toContain('MAX_PHOTO_CHARS = 300_000')
    expect(form).not.toMatch(/quality:\s*\d+/)
    expect(form).toContain("sizeType: ['compressed']")
  })

  it('renders photo anniversaries as fully visible photo cards with an info strip', () => {
    const list = fs.readFileSync(listPath, 'utf8')
    const styles = fs.readFileSync(stylesPath, 'utf8')

    // 照片完整展示不裁切：aspectFit + onLoad 实测比例定高，倒计时信息移到下方实底信息条
    expect(list).toContain('anniv-list__photo-card')
    expect(list).toContain('mode="aspectFit"')
    expect(list).toContain('anniversaryPhotoBoxHeight')
    expect(list).not.toContain('mode="aspectFill"')
    expect(list).not.toContain('photo-mask')
    expect(styles).toContain('.anniv-list__photo-card {')
    expect(styles).toContain('.anniv-list__photo-stage {')
    expect(styles).toContain('.anniv-list__photo-info {')
    expect(styles).not.toContain('.anniv-list__photo-mask')
    expect(styles).toMatch(/\.anniv-list__photo-num \{[^}]*96rpx/)
  })

  it('keeps the form icon row borderless, fixed and aligned with the mood picker pattern', () => {
    const form = fs.readFileSync(formPath, 'utf8')
    const styles = fs.readFileSync(stylesPath, 'utf8')

    // 不用 Button 原生样式（自带边框与可滑动清除），与心情选择一样直接用 View
    expect(form).not.toMatch(/<Button[^>]*anniv-form__icon-item/)
    expect(form).toMatch(/<View key=\{key\} className=\{`anniv-form__icon-item/)
    expect(styles).toMatch(/\.anniv-form__icon-item \{[^}]*border: 2rpx solid transparent/)
    expect(styles).not.toMatch(/\.anniv-form__icon-item \{[^}]*overflow-x/)
  })

  it('keeps the form photo picker inside the warm card frame', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')

    expect(styles).toContain('.anniv-form__photo {')
    expect(styles).toContain('.anniv-form__photo-empty--busy {')
  })

  it('renders the inline settings form as a fixed one-screen layout without scrolling', () => {
    const panel = fs.readFileSync(path.resolve(__dirname, 'JournalAnniversaryPanel.tsx'), 'utf8')
    const styles = fs.readFileSync(stylesPath, 'utf8')

    // 页内嵌入：表单卡片弹性占满内容区、不套滚动槽；照片预览区 [88, 420]rpx 自适应伸缩吸收高差，
    // 无标题行；内部滚动槽只包列表
    expect(panel).toMatch(/form \? content : <View className="journal-anniv-panel__scroll">\{content\}<\/View>/)
    expect(styles).toMatch(/\.journal-anniv-panel--inline \.anniv-form \{[^}]*flex: 1;/)
    expect(styles).toMatch(/\.journal-anniv-panel--inline \.anniv-form \{[^}]*min-height: 0;/)
    expect(styles).toMatch(/\.journal-anniv-panel--inline \.anniv-form__title \{[^}]*display: none;/)
    expect(styles).toMatch(/\.journal-anniv-panel--inline \.anniv-form__photo \{[^}]*flex: 1 0 auto;/)
    expect(styles).toMatch(/\.journal-anniv-panel--inline \.anniv-form__photo \{[^}]*min-height: 88rpx;/)
    expect(styles).toMatch(/\.journal-anniv-panel--inline \.anniv-form__photo \{[^}]*max-height: 420rpx;/)
  })

  it('falls back to narrower widths before failing an oversized photo, never lowering quality', () => {
    const form = fs.readFileSync(formPath, 'utf8')

    expect(form).toContain('PHOTO_WIDTHS = [1080, 900, 720, 540, 420]')
    expect(form).not.toMatch(/quality:\s*\d+/)
  })

  it('locks the anniversary overlay to one non-scrollable screen', () => {
    const panelStyles = fs.readFileSync(panelStylesPath, 'utf8')

    // 覆盖层与写日记一致：定高 + overflow hidden，杜绝整页滑动
    expect(panelStyles).toMatch(/\.journal-anniv-overlay \{[^}]*overflow: hidden;/)
    expect(panelStyles).not.toMatch(/\.journal-anniv-overlay \{[^}]*overflow-y: auto/)
    expect(panelStyles).toMatch(/\.journal-anniv-panel \{[^}]*height: 100%;/)
    expect(panelStyles).toMatch(/\.journal-anniv-panel \{[^}]*overflow: hidden;/)
  })

  it('embeds the anniversary tab inline in the journal page with an inner scroll slot', () => {
    const panel = fs.readFileSync(path.resolve(__dirname, 'JournalAnniversaryPanel.tsx'), 'utf8')
    const panelStyles = fs.readFileSync(panelStylesPath, 'utf8')
    const view = fs.readFileSync(path.resolve(__dirname, 'MiniappJournalView.tsx'), 'utf8')

    // 「纪念日」是小记页内分页 tab：顶部标题/分页与底部运势条不动，面板弹性填充、内容区内部滚动
    expect(panel).toContain("variant = 'overlay'")
    expect(panel).toContain('journal-anniv-panel--inline')
    expect(panel).toContain('journal-anniv-panel__scroll')
    expect(panelStyles).toMatch(/\.journal-anniv-panel--inline \{[^}]*flex: 1;/)
    expect(panelStyles).toMatch(/\.journal-anniv-panel--inline \{[^}]*min-height: 0;/)
    expect(panelStyles).toMatch(/\.journal-anniv-panel__scroll \{[^}]*overflow-y: auto;/)
    expect(view).toContain('<JournalAnniversaryPanel roomId={roomId} variant="inline" />')
    expect(view).not.toContain('setAnniversaryOpen')
  })
})
