import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const formPath = path.resolve(__dirname, 'AnniversaryForm.tsx')
const listPath = path.resolve(__dirname, 'AnniversaryListView.tsx')
const stylesPath = path.resolve(__dirname, 'anniversary.scss')

describe('anniversary photo presentation rules', () => {
  it('compresses the chosen photo once through the services layer without lowering quality', () => {
    const form = fs.readFileSync(formPath, 'utf8')

    expect(form).toContain("from '../../services/imageCompression'")
    expect(form).toContain('compressImageToDataUrl')
    expect(form).toContain('MAX_PHOTO_CHARS = 300_000')
    expect(form).not.toMatch(/quality:\s*\d+/)
    expect(form).toContain("sizeType: ['compressed']")
  })

  it('renders photo anniversaries as full-bleed countdown cards', () => {
    const list = fs.readFileSync(listPath, 'utf8')
    const styles = fs.readFileSync(stylesPath, 'utf8')

    expect(list).toContain('anniv-list__photo-card')
    expect(list).toContain('mode="aspectFill"')
    expect(styles).toContain('.anniv-list__photo-card {')
    expect(styles).toContain('.anniv-list__photo-mask {')
    expect(styles).toMatch(/\.anniv-list__photo-num \{[^}]*132rpx/)
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
})
