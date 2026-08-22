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
    expect(styles).toContain('@keyframes miniapp-tarot-orbit-sway')
    expect(styles).toContain('@keyframes miniapp-tarot-rune-charge')
    expect(styles).toContain('@keyframes miniapp-tarot-shuffle-burst')
  })

  it('uses an expanded, layered shuffle motion with wider card trajectories', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')

    // two-slot swap loop: cards fly out and land in the other pile slot
    expect(styles).toContain('miniapp-tarot-shuffle-left 5.6s')
    expect(styles).toContain('miniapp-tarot-shuffle-right 5.6s')
    expect(styles).toContain('translateX(-138%)')
    expect(styles).toContain('translateX(38%)')
    expect(styles).toContain('translateX(-40%)')
    expect(styles).toContain('translateX(-60%)')
    // staggered wave delays between deck cards
    expect(styles).toContain('animation-delay: -.7s')
    expect(styles).toContain('animation-delay: -1.4s')
    // floating deck drift while holding
    expect(styles).toContain('@keyframes miniapp-tarot-deck-hover')
    // compact arcane circle layers with pulsing glow and orbit node
    expect(styles).toContain('@keyframes miniapp-tarot-mist-glow')
    expect(styles).toContain('@keyframes miniapp-tarot-orbit-node')
    expect(styles).toContain('@keyframes miniapp-tarot-ring-sway')
    expect(styles).toContain('width: 370rpx')
    expect(styles).not.toContain('width: 600rpx')
    // stronger rune charge
    expect(styles).toContain('scale(1.22)')
  })

  it('centers the shuffle stage column and keeps text clear of the flying deck', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')
    const shuffleStage = fs.readFileSync(shuffleStagePath, 'utf8')

    expect(shuffleStage).toContain('miniapp-tarot__stage--shuffle')
    expect(styles).toContain('.miniapp-tarot__stage--shuffle')
    // dedicated centered layout for the shuffle column
    expect(styles).toMatch(/\.miniapp-tarot__stage--shuffle[\s\S]*justify-content: center/)
    // trajectory stays below the title line
    expect(styles).toContain('translateY(-46rpx) rotate(-17deg)')
    expect(styles).not.toContain('translateY(-72rpx)')
    // title keeps a safety gap above the flying deck
    expect(styles).toContain('margin-bottom: 64rpx')
  })

  it('restacks the deck as one pile with a top-first reorder once shuffling completes', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')
    const shuffleStage = fs.readFileSync(shuffleStagePath, 'utf8')

    expect(styles).toContain('@keyframes miniapp-tarot-shuffle-settle')
    // cards lift high, swing aside, then return to the single stacked position
    expect(styles).toContain('translateY(-150rpx) rotate(-6deg)')
    expect(styles).toContain('z-index: 30')
    // top card flies first: card 10 has no delay, deeper cards wait longer
    expect(styles).toContain('.miniapp-tarot__shuffle-deck--complete .miniapp-tarot__deck-card')
    expect(styles).toContain('(10 - $index) * 0.06')
    expect(styles).not.toContain('--settle-x')
    // complete state pauses while the user keeps holding, so the active loop wins
    expect(shuffleStage).toContain('progress >= 100 && !isShuffling')
  })

  it('keeps every shuffle animation disabled under reduced motion', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')

    expect(styles).toContain('@media (prefers-reduced-motion: reduce)')
    expect(styles).toContain('animation-duration: .01ms !important')
    expect(styles).toContain('transition-duration: .01ms !important')
  })
})
