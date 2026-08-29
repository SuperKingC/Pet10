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

  it('keeps the form photo picker inside the warm card frame', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')

    expect(styles).toContain('.anniv-form__photo {')
    expect(styles).toContain('.anniv-form__photo-empty--busy {')
  })
})
