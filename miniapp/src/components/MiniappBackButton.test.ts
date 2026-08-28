import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const componentsDir = path.resolve(__dirname)
const readSource = (relative: string) =>
  fs.readFileSync(path.resolve(componentsDir, relative), 'utf8')

const backUsages = [
  '../features/main/JournalEditorForm.tsx',
  '../features/main/JournalAnniversaryPanel.tsx',
  '../features/main/MiniappFortuneView.tsx',
  '../features/main/MiniappGamesPage.tsx',
  '../features/main/MiniappGobangPanel.tsx',
]

describe('miniapp back button', () => {
  it('provides one shared arrow-only back button for the whole miniapp', () => {
    const component = readSource('MiniappBackButton.tsx')
    const styles = readSource('MiniappBackButton.scss')

    expect(component).toContain('miniapp-back-button')
    expect(component).toContain('aria-label="返回"')
    expect(component).toContain('miniapp-back-button__icon')
    expect(styles).toContain('rotate(45deg)')
    expect(styles).toContain('border-left: 4rpx solid #5e3b1d')
    expect(styles).not.toContain('border-radius: 50%')
    expect(styles).not.toContain('box-shadow')
    expect(styles).not.toContain('background:')
  })

  it('replaces every self-drawn back control with the shared component', () => {
    for (const usage of backUsages) {
      const source = readSource(usage)
      expect(source, usage).toContain('MiniappBackButton')
      expect(source, usage).not.toMatch(/‹/)
      expect(source, usage).not.toMatch(/>返回</)
    }
  })

  it('removes the old per-view back styles', () => {
    expect(readSource('../features/main/JournalEditorForm.scss')).not.toContain('journal-editor__back')
    expect(readSource('../features/main/JournalAnniversaryPanel.scss')).not.toContain('journal-anniv-panel__back')
    expect(readSource('../features/main/MiniappFortuneView.scss')).not.toContain('fortune-view__back')
    expect(readSource('../features/main/MiniappGamesPage.scss')).not.toMatch(/header button/)
    expect(readSource('../features/main/MiniappGobangPanel.scss')).not.toMatch(/header button/)
  })
})
