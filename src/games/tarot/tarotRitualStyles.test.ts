import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')
const game = readFileSync(resolve(process.cwd(), 'src/games/tarot/TarotGame.tsx'), 'utf8')

describe('tarot ritual interaction', () => {
  it('moves the tarot room header away from the top edge', () => {
    expect(css).toMatch(/\.tarot-game__header\s*\{[^}]*padding:\s*calc\(20px \+ env\(safe-area-inset-top\)\)/s)
  })

  it('starts as a neat stack and interleaves cards during the purple-mist shuffle', () => {
    expect(game).toContain('Array.from({ length: 10 }')
    expect(game).toContain('tarot-shuffle-deck__slot')
    expect(css).toMatch(/\.tarot-shuffle-deck\s*\{[^}]*width:\s*min\(92vw,\s*360px\)/s)
    expect(css).toMatch(/\.tarot-shuffle-deck \.tarot-shuffle-deck__card\s*\{[^}]*transform:none/s)
    expect(css).toMatch(/\.tarot-shuffle-deck__slot\s*\{[^}]*transform:translate3d\(0,0,0\) rotate\(0deg\)/s)
    expect(css).toContain('@keyframes tarot-shuffle-interleave-left')
    expect(css).toContain('@keyframes tarot-shuffle-interleave-right')
    expect(css).toContain('tarot-shuffle-deck:active::before')
    expect(css).toMatch(/\.tarot-shuffle-deck\s*\{[^}]*--shuffle-x:\s*92px;[^}]*--shuffle-y:\s*-34px;[^}]*--shuffle-z:\s*28px;/s)
    expect(css).toMatch(/\.tarot-shuffle-deck:active \.tarot-shuffle-deck__slot:nth-child\(odd\)[^{]*\{[^}]*animation:tarot-shuffle-interleave-left 2\.4s/s)
    expect(css).toMatch(/\.tarot-shuffle-deck:active \.tarot-shuffle-deck__slot:nth-child\(even\)[^{]*\{[^}]*animation:tarot-shuffle-interleave-right 2\.4s/s)
    expect(css).toMatch(/@keyframes tarot-shuffle-interleave-left[\s\S]*?translate3d\(calc\(var\(--shuffle-x\) \* -1\),var\(--shuffle-y\),var\(--shuffle-z\)\)/s)
    expect(css).toMatch(/@keyframes tarot-shuffle-interleave-right[\s\S]*?translate3d\(var\(--shuffle-x\),var\(--shuffle-y\),var\(--shuffle-z\)\)/s)
    expect(css).toContain('nth-child(odd)')
    expect(css).toContain('nth-child(even)')
    expect(css).toContain('animation-delay:-.08s')
  })

  it('keeps shuffle progress off the interval-driven render loop', () => {
    expect(game).toContain('requestAnimationFrame')
    expect(game).toContain('cancelAnimationFrame')
    expect(game).toContain('shuffleProgressRef')
    expect(game).not.toContain('window.setInterval(startShuffle')
  })

  it('keeps the card motion on compositor-friendly properties', () => {
    const shuffleAnimation = css.match(/@keyframes tarot-shuffle-interleave-left\s*\{([^{}]|\{[^{}]*\})*\}/g)?.at(-1)
    const pickAnimation = css.match(/@keyframes tarot-pick-glow\s*\{([^{}]|\{[^{}]*\})*\}/g)?.at(-1)
    const cutAnimation = css.match(/@keyframes tarot-cut-upper\s*\{([^{}]|\{[^{}]*\})*\}/g)?.at(-1)
    expect(shuffleAnimation).toBeDefined()
    expect(pickAnimation).toBeDefined()
    expect(cutAnimation).toBeDefined()
    expect(shuffleAnimation).not.toMatch(/filter\s*:/)
    expect(pickAnimation).not.toMatch(/filter\s*:/)
    expect(cutAnimation).not.toMatch(/filter\s*:/)
  })

  it('cuts the upper half over the lower half with a coordinated return', () => {
    expect(css).not.toContain('offset-path:')
    expect(css).toContain('animation:tarot-cut-upper 1.15s')
    expect(css).toContain('animation-name:tarot-cut-upper-reverse')
    expect(css).toContain('animation:tarot-cut-lower 1.15s')
    expect(css).toMatch(/@keyframes tarot-cut-upper\s*\{[\s\S]*?22%[\s\S]*?48%[\s\S]*?76%[\s\S]*?90%[\s\S]*?100%/s)
    const cutStart = css.lastIndexOf('@keyframes tarot-cut-upper {')
    const cutEnd = css.indexOf('@keyframes', cutStart + 1)
    const cutFrames = css.slice(cutStart, cutEnd < 0 ? undefined : cutEnd)
    expect(cutFrames).not.toContain('z-index')
    expect(cutFrames).toContain('translate3d(0,-34px,24px)')
    expect(cutFrames).toContain('translate3d(4px,-24px,72px)')
    expect(cutFrames).toContain('translate3d(0,12px,-14px)')
    expect(cutFrames).not.toContain('translate3d(58px')
    expect(css).toContain('translate3d(0,12px,-14px)')
    expect(game).toContain("event.animationName !== 'tarot-cut-upper'")
    expect(game).toContain("event.animationName !== 'tarot-cut-upper-reverse'")
    expect(game).toContain(
      '<span className="tarot-cut-deck__left" onAnimationEnd={finishCut} /><span className="tarot-cut-deck__right" onAnimationEnd={finishCut} />'
    )
    expect(game).toContain("cutCount % 2 ? 'tarot-cut-deck--swapped' : ''")
  })

  it('keeps one cut pile continuous while its depth and thickness stay visible', () => {
    const activeCutStart = css.lastIndexOf('.tarot-cut-deck {')
    const activeCutEnd = css.indexOf('.tarot-picked-row {', activeCutStart)
    const activeCut = css.slice(activeCutStart, activeCutEnd)
    const upperStart = css.lastIndexOf('@keyframes tarot-cut-upper {')
    const upperEnd = css.indexOf('@keyframes', upperStart + 1)
    const upperFrames = css.slice(upperStart, upperEnd)
    const lowerStart = css.lastIndexOf('@keyframes tarot-cut-lower {')
    const lowerEnd = css.indexOf('@keyframes', lowerStart + 1)
    const lowerFrames = css.slice(lowerStart, lowerEnd)

    expect(activeCut).toContain('perspective:1100px')
    expect(activeCut).toContain('transform-style:preserve-3d')
    expect(activeCut).toContain('.tarot-cut-deck__left::before,.tarot-cut-deck__right::before')
    expect(activeCut).toContain('.tarot-cut-deck__left::after,.tarot-cut-deck__right::after')
    expect(activeCut).toContain('animation:tarot-cut-upper 1.15s')
    expect(activeCut).toContain('animation:tarot-cut-lower 1.15s')
    expect(activeCut).toContain('transform:translate3d(0,12px,-14px)')

    expect(upperFrames).toMatch(/0%[\s\S]*?22%[\s\S]*?48%[\s\S]*?76%[\s\S]*?90%[\s\S]*?100%/s)
    expect(upperFrames).toContain('translate3d(0,-34px,24px) rotateX(-7deg)')
    expect(upperFrames).toContain('translate3d(4px,-24px,72px) rotateX(-10deg)')
    expect(upperFrames).toContain('translate3d(2px,6px,44px) rotateX(-6deg)')
    expect(upperFrames).toContain('translate3d(0,12px,-14px) rotateX(0) rotateZ(0)')
    expect(upperFrames).not.toMatch(/translate3d\([5-9][0-9]px/)
    expect(upperFrames).not.toContain('z-index')

    expect(lowerFrames).toContain('0%,70%')
    expect(lowerFrames).toContain('translate3d(0,12px,-14px)')
    expect(lowerFrames).toContain('translate3d(0,11px,-6px) rotateX(2deg)')
    expect(lowerFrames).toContain('translate3d(0,0,0) rotateX(0)')
    expect(lowerFrames).not.toMatch(/translate3d\([^,]+,-[12][0-9]px/)
  })

  it('draws each selected card upward from a visible lower deck anchor', () => {
    expect(game).toContain('tarot-fan__deck-anchor')
    expect(game).toContain('onPointerCancel={handleShuffleUp}')
    expect(game).toContain('tarot-fan__card--picked')
    expect(game).toContain("'--fan-angle': `${(index - 4.5) * 6}deg`")
    expect(game).toContain("'--fan-drop': `${Math.abs(index - 4.5) * 3}px`")
    expect(game).toContain("if (prefersReducedMotion())")
    expect(game).toContain('if (flyingCard !== null || picked.includes(index) || picked.length >= needCount) return')
    expect(game).toContain('disabled={picked.includes(index) || flyingCard !== null}')
    expect(game).toContain("'--fan-x': `${(index - 4.5) * 18}px`")
    expect(game).toContain("'--fan-mid-x': `${(index - 4.5) * 9.9}px`")
    expect(css).toContain('@keyframes tarot-pick-smooth')
    expect(css).toMatch(/\.tarot-fan__card--flying\s*\{[^}]*animation:tarot-pick-smooth \.82s/s)
    expect(css).toMatch(/@keyframes tarot-pick-smooth[\s\S]*?42%\s*\{\s*transform:translate3d\(0,153px,26px\)/s)
    expect(css).toMatch(/@keyframes tarot-pick-smooth[\s\S]*?74%\s*\{\s*transform:translate3d\(0,-6px,28px\)/s)
    expect(css).toMatch(/\.tarot-picked-row\s*\{[^}]*gap:\s*clamp\(18px,6vw,34px\)/s)
    expect(css).toMatch(/@media\(prefers-reduced-motion:reduce\)[\s\S]*?\.tarot-fan__card--flying,\.tarot-fan__card--flying \.tarot-fan__visual\{animation-duration:\.01ms!important;animation-iteration-count:1!important;\}/s)
  })

  it('keeps five picked cards inside the stage on narrow screens', () => {
    expect(css).toMatch(/\.tarot-picked-row\s*\{[^}]*gap:\s*clamp\(18px,\s*6vw,\s*34px\)/s)
    expect(css).toMatch(/\.tarot-picked-card\s*\{[^}]*width:\s*clamp\(46px,\s*15vw,\s*76px\)/s)
    expect(css).toMatch(/\.tarot-picked-card\s*\{[^}]*height:\s*clamp\(72px,\s*23\.5vw,\s*118px\)/s)
    expect(css).toMatch(/@media\(max-width:380px\)[\s\S]*?\.tarot-picked-card\{width:clamp\(46px,15vw,76px\);height:clamp\(72px,23\.5vw,118px\)\}/s)
  })

  it('places the reveal cards lower in the ritual stage', () => {
    expect(css).toMatch(/\.tarot-reveal-row\s*\{[^}]*margin:\s*44px 0 48px/s)
  })

  it('flies a selected card smoothly through the deck anchor on the positioned wrapper', () => {
    expect(game).toContain('tarot-fan__visual')
    expect(game).toContain("event.animationName === 'tarot-pick-smooth'")
    expect(css).toMatch(/\.tarot-fan__card--flying\s*\{[^}]*animation:tarot-pick-smooth \.82s/s)
    expect(css).toContain('@keyframes tarot-pick-smooth')
  })

  it('keeps reveal labels upright and crops artwork that has excess margins', () => {
    expect(css).toMatch(/\.tarot-card--flipped\s*\{[^}]*transform:\s*none/s)
    expect(css).toMatch(/\.tarot-card__art--crop\s*\{[^}]*scale:\s*1\.08/s)
  })
})
