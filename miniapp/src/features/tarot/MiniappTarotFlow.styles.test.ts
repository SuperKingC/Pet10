import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const stylesPath = path.resolve(__dirname, 'MiniappTarotFlow.scss')
const shuffleStagePath = path.resolve(__dirname, 'MiniappTarotShuffleStage.tsx')

describe('miniapp tarot WXSS compatibility', () => {
  it('does not emit universal selectors unsupported by the WeChat WXSS compiler', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')

    expect(styles).not.toMatch(/\.miniapp-tarot\s+\*/)
    expect(styles).not.toMatch(/\.miniapp-tarot\s+\*::/)
  })

  it('renders a visible state-driven arcane shuffle ritual', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')
    const shuffleStage = fs.readFileSync(shuffleStagePath, 'utf8')

    expect(shuffleStage).toContain('useState(false)')
    expect(shuffleStage).toContain('setIsShuffling(true)')
    expect(shuffleStage).toContain('setIsShuffling(false)')
    expect(shuffleStage).toContain('miniapp-tarot__shuffle-deck--active')
    expect(shuffleStage).toContain('miniapp-tarot__shuffle-deck--complete')
    expect(shuffleStage).toContain('miniapp-tarot__shuffle-orbit--outer')
    expect(shuffleStage).toContain('miniapp-tarot__shuffle-rune')
    expect(shuffleStage).toContain('miniapp-tarot__shuffle-burst')
    expect(styles).toContain('@keyframes miniapp-tarot-orbit-spin')
    expect(styles).toContain('@keyframes miniapp-tarot-rune-charge')
    expect(styles).toContain('@keyframes miniapp-tarot-shuffle-burst')
  })
})
