import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/games/tarot/tarotRitual.css'), 'utf8')
const game = readFileSync(resolve(process.cwd(), 'src/games/tarot/TarotGame.tsx'), 'utf8')
const shuffleStage = readFileSync(resolve(process.cwd(), 'src/games/tarot/TarotShuffleStage.tsx'), 'utf8')
const cutStage = readFileSync(resolve(process.cwd(), 'src/games/tarot/TarotCutStage.tsx'), 'utf8')
const fanStage = readFileSync(resolve(process.cwd(), 'src/games/tarot/TarotFanStage.tsx'), 'utf8')
const pressProgress = readFileSync(resolve(process.cwd(), 'src/games/tarot/usePressProgress.ts'), 'utf8')

describe('tarot ritual interaction', () => {
  it('moves the tarot room header away from the top edge', () => {
    expect(css).toMatch(/\.tarot-game__header\s*\{[^}]*padding:\s*calc\(20px \+ env\(safe-area-inset-top\)\)/s)
  })

  it('starts as a neat stack and interleaves cards during the purple-mist shuffle', () => {
    expect(shuffleStage).toContain('Array.from({ length: 10 }')
    expect(shuffleStage).toContain('tarot-shuffle-deck__slot')
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
    expect(pressProgress).toContain('requestAnimationFrame')
    expect(pressProgress).toContain('cancelAnimationFrame')
    expect(pressProgress).toContain('progressRef')
    expect(pressProgress).not.toContain('setInterval')
  })

  it('keeps the card motion on compositor-friendly properties', () => {
    const shuffleAnimation = css.match(/@keyframes tarot-shuffle-interleave-left\s*\{([^{}]|\{[^{}]*\})*\}/g)?.at(-1)
    const pickAnimation = css.match(/@keyframes tarot-pick-glow\s*\{([^{}]|\{[^{}]*\})*\}/g)?.at(-1)
    expect(shuffleAnimation).toBeDefined()
    expect(pickAnimation).toBeDefined()
    expect(shuffleAnimation).not.toMatch(/filter\s*:/)
    expect(pickAnimation).not.toMatch(/filter\s*:/)
  })

  it('drives the standard table cut from one frame clock instead of CSS keyframes', () => {
    expect(css).not.toContain('offset-path:')
    expect(css).not.toContain('@keyframes tarot-cut-upper')
    expect(css).not.toContain('@keyframes tarot-cut-upper-reverse')
    expect(css).not.toContain('@keyframes tarot-cut-lower')
    expect(cutStage).toContain('requestAnimationFrame')
    expect(cutStage).toContain('cancelAnimationFrame')
    expect(cutStage).toContain('getTarotCutFrame')
    expect(game).toContain("animationName !== 'tarot-cut-upper'")
    expect(game).toContain("animationName !== 'tarot-cut-upper-reverse'")
    expect(cutStage).toContain('tarot-cut-deck__left')
    expect(cutStage).toContain('tarot-cut-deck__right')
    expect(cutStage).toContain('tarot-cut-deck__shadow')
    expect(cutStage).toContain('swapped ? \'tarot-cut-deck--swapped\' : \'\'')
  })

  it('keeps one cut pile continuous while its depth and thickness stay visible', () => {
    const activeCutStart = css.lastIndexOf('.tarot-cut-deck {')
    const activeCutEnd = css.indexOf('.tarot-picked-row {', activeCutStart)
    const activeCut = css.slice(activeCutStart, activeCutEnd)
    expect(activeCut).toContain('perspective:1100px')
    expect(activeCut).toContain('transform-style:preserve-3d')
    expect(activeCut).toContain('.tarot-cut-deck__sheet')
    expect(activeCut).toContain('.tarot-cut-deck__sheet--10')
    expect(activeCut).toContain('border:1px solid rgba(245,232,204,.92)')
    expect(activeCut).toContain('0 1px 0 rgba(20,14,27,.95)')
    expect(activeCut).toContain('background:#302939')
    expect(activeCut).toContain('translate3d(.2px,.65px,-1px)')
    expect(activeCut).toContain('translate3d(2px,6.5px,-10px)')
    expect(activeCut).not.toContain('linear-gradient(180deg,#d9c4a6,#765a43)')
    expect(activeCut).not.toContain('linear-gradient(180deg,#9f7e5d,#39283a)')
    expect(activeCut).toContain('.tarot-cut-deck__shadow')
    expect(activeCut).toContain('transform:translate3d(0,22px,-20px)')
    expect(activeCut).toContain('transform:translate3d(0,-5px,-126px)')
    expect(activeCut).toContain('transform:translate3d(0,-13px,20px)')
    expect(activeCut).not.toContain('animation:tarot-cut-upper')
    expect(activeCut).not.toContain('animation:tarot-cut-lower')
  })

  it('draws each selected card upward from a visible lower deck anchor', () => {
    expect(fanStage).toContain('tarot-fan__deck-anchor')
    expect(shuffleStage).toContain('onPointerCancel={handlePointerEnd}')
    expect(fanStage).toContain('tarot-fan__card--picked')
    expect(fanStage).toContain("'--fan-angle': `${(index - 4.5) * 6}deg`")
    expect(fanStage).toContain("'--fan-drop': `${Math.abs(index - 4.5) * 3}px`")
    expect(game).toContain('prefersReducedMotion()')
    expect(fanStage).toContain('disabled={picked.includes(index) || flyingCard !== undefined}')
    expect(fanStage).toContain("'--fan-x': `${(index - 4.5) * 18}px`")
    expect(fanStage).toContain("'--fan-mid-x': `${(index - 4.5) * 9.9}px`")
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
    expect(fanStage).toContain('tarot-fan__visual')
    expect(fanStage).toContain("event.animationName === 'tarot-pick-smooth'")
    expect(css).toMatch(/\.tarot-fan__card--flying\s*\{[^}]*animation:tarot-pick-smooth \.82s/s)
    expect(css).toContain('@keyframes tarot-pick-smooth')
  })

  it('keeps reveal labels upright and crops artwork that has excess margins', () => {
    expect(css).toMatch(/\.tarot-card--flipped\s*\{[^}]*transform:\s*none/s)
    expect(css).toMatch(/\.tarot-card__art--crop\s*\{[^}]*scale:\s*1\.08/s)
  })
})
