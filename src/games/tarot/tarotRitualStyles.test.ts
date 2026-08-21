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
  it('uses runtime tarot asset variables instead of same-origin UI image paths', () => {
    expect(css).toContain('var(--tarot-card-back)')
    expect(css).toContain('var(--tarot-sanctuary-background)')
    expect(css).not.toContain("url('/tarot/ui/card-back.jpg')")
    expect(css).not.toContain("url('/tarot/ui/sanctuary-background.jpg')")
  })

  it('uses one sharp rendering contract for every card-back and card-art scene', () => {
    const cardImageSelectors = [
      '.tarot-shuffle-deck__card',
      '.tarot-spread__layout i',
      '.tarot-cut-deck__face',
      '.tarot-picked-card',
      '.tarot-fan__visual',
      '.tarot-fan-flight',
      '.tarot-card3d__back',
      '.tarot-card3d__front',
      '.tarot-card3d__front img',
      '.tarot-card__back',
      '.tarot-card__front',
      '.tarot-card__art',
      '.tarot-reading__art'
    ]

    const imageQualityRule = css.match(/:where\(([^)]*)\)\s*\{[^}]*image-rendering:\s*-webkit-optimize-contrast/s)?.[0]
    expect(imageQualityRule).toBeDefined()
    for (const selector of cardImageSelectors) {
      expect(imageQualityRule).toContain(selector)
    }
  })

  it('keeps the static fan cards on whole-pixel vertical offsets without pre-compositing their artwork', () => {
    expect(fanStage).toContain('Math.round(Math.abs(index - 4.5) * 3)')
    expect(css).toMatch(/\.tarot-fan__visual\s*\{(?![^}]*will-change:)[^}]*(?=\})/s)
  })

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
    expect(css).toMatch(/\.tarot-shuffle-deck:active \.tarot-shuffle-deck__slot--odd[^{]*\{[^}]*animation:tarot-shuffle-interleave-left 2\.4s/s)
    expect(css).toMatch(/\.tarot-shuffle-deck:active \.tarot-shuffle-deck__slot--even[^{]*\{[^}]*animation:tarot-shuffle-interleave-right 2\.4s/s)
    expect(css).toMatch(/@keyframes tarot-shuffle-interleave-left[\s\S]*?translate3d\(calc\(var\(--shuffle-x\) \* -1\),var\(--shuffle-y\),var\(--shuffle-z\)\)/s)
    expect(css).toMatch(/@keyframes tarot-shuffle-interleave-right[\s\S]*?translate3d\(var\(--shuffle-x\),var\(--shuffle-y\),var\(--shuffle-z\)\)/s)
    expect(shuffleStage).toContain('tarot-shuffle-deck__slot--${index % 2 ?')
    expect(css).toContain('animation-delay:-.08s')
  })

  it('builds a layered arcane ritual around the held shuffle deck', () => {
    expect(shuffleStage).toContain('tarot-shuffle-deck__orbit')
    expect(shuffleStage).toContain('tarot-shuffle-deck__rune')
    expect(shuffleStage).toContain('tarot-shuffle-deck__burst')
    expect(css).toMatch(/\.tarot-shuffle-deck__orbit\s*\{[^}]*border:1px solid/s)
    expect(css).toContain('@keyframes tarot-shuffle-orbit')
    expect(css).toContain('@keyframes tarot-shuffle-charge')
    expect(css).toContain('@keyframes tarot-shuffle-burst')
    expect(css).toContain('.tarot-shuffle-deck--complete')
    expect(css).toMatch(/@media\(prefers-reduced-motion:reduce\)[\s\S]*?\.tarot-shuffle-deck__orbit\{animation:none/s)
  })

  it('keeps shuffle progress off the interval-driven render loop', () => {
    expect(pressProgress).toContain('requestAnimationFrame')
    expect(pressProgress).toContain('cancelAnimationFrame')
    expect(pressProgress).toContain('progressRef')
    expect(pressProgress).not.toContain('setInterval')
  })

  it('keeps the card motion on compositor-friendly properties', () => {
    const shuffleAnimation = css.match(/@keyframes tarot-shuffle-interleave-left\s*\{([^{}]|\{[^{}]*\})*\}/g)?.at(-1)
    expect(shuffleAnimation).toBeDefined()
    expect(shuffleAnimation).not.toMatch(/filter\s*:/)
    expect(fanStage).toContain('flightElement.current.animate(flight.keyframes, flight.options)')
    expect(fanStage).not.toContain("filter: '")
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

  it('draws each selected card upward without a decorative lower deck anchor', () => {
    expect(shuffleStage).toContain('onPointerCancel={handlePointerEnd}')
    expect(fanStage).toContain('tarot-fan__card--picked')
    expect(fanStage).toContain("'--fan-angle': `${(index - 4.5) * 6}deg`")
    expect(fanStage).toContain("'--fan-drop': `${Math.round(Math.abs(index - 4.5) * 3)}px`")
    expect(game).toContain('prefersReducedMotion()')
    expect(fanStage).toContain('disabled={picked.includes(index) || flyingCard !== undefined}')
    expect(fanStage).toContain("'--fan-x': `${(index - 4.5) * 18}px`")
    expect(fanStage).toContain('source.offsetWidth || 58')
    expect(fanStage).toContain('source.offsetHeight || 92')
    expect(fanStage).toContain('pickedSlots.current[picked.length]')
    expect(fanStage).toContain('createPortal')
    expect(fanStage).not.toContain('tarot-fan__deck-anchor')
    expect(css).not.toContain('.tarot-fan__deck-anchor')
    expect(css).toMatch(/\.tarot-picked-row\s*\{[^}]*gap:\s*clamp\(6px,1\.5vw,14px\)/s)
    expect(css).toMatch(/@media\(prefers-reduced-motion:reduce\)[\s\S]*?\.tarot-fan-flight\{display:none;\}/s)
  })

  it('keeps five picked cards inside the stage on narrow screens', () => {
    expect(fanStage).toContain('tarot-picked-row--${needCount}')
    expect(css).toMatch(/\.tarot-picked-row\s*\{[^}]*gap:\s*clamp\(6px,\s*1\.5vw,\s*14px\)/s)
    expect(css).toMatch(/\.tarot-picked-row\s*\{[^}]*margin:\s*20px 0 16px/s)
    expect(css).toMatch(/\.tarot-picked-slot\s*\{[^}]*width:\s*clamp\(62px,\s*16vw,\s*78px\)/s)
    expect(css).toMatch(/\.tarot-picked-slot\s*\{[^}]*height:\s*clamp\(98px,\s*25vw,\s*122px\)/s)
    expect(css).toMatch(/\.tarot-fan__card\s*\{[^}]*width:\s*58px;[^}]*height:\s*92px/s)
    expect(css).toMatch(/\.tarot-picked-row--3\s*\{[^}]*gap:\s*clamp\(20px,\s*6vw,\s*28px\)/s)
    expect(css).toMatch(/@media\(max-width:380px\)[\s\S]*?\.tarot-picked-row--5\{gap:3px\}/s)
    expect(css).toMatch(/@media\(max-width:380px\)[\s\S]*?\.tarot-picked-row--5 \.tarot-picked-slot\{width:52px;height:82px\}/s)
    expect(css).not.toMatch(/\.tarot-picked-row--5 \.tarot-picked-slot\+\.tarot-picked-slot\{margin-left:-/s)
    expect(css).toMatch(/@media\(max-width:380px\)[\s\S]*?\.tarot-fan__card\{width:48px;height:76px\}/s)
  })

  it('places the reveal cards lower in the ritual stage', () => {
    expect(css).toMatch(/\.tarot-reveal-row\s*\{[^}]*margin:\s*44px 0 48px/s)
  })

  it('styles a measured flight overlay without overriding the fan card transform', () => {
    expect(fanStage).toContain('tarot-fan-flight')
    expect(fanStage).not.toContain('tarot-fan-flight__trail')
    expect(fanStage).not.toContain('tarot-fan-flight__particles')
    expect(fanStage).not.toContain('tarot-fan-flight__glint')
    expect(fanStage).not.toContain('tarot-fan-flight__burst')
    expect(fanStage).toContain('createTarotFanFlight')
    expect(css).toMatch(/\.tarot-fan-flight\s*\{[^}]*position:\s*fixed/s)
    expect(css).toMatch(/\.tarot-fan-flight\s*\{[^}]*will-change:\s*transform,opacity/s)
    expect(css).toMatch(/\.tarot-fan__card--departing\s+\.tarot-fan__visual\s*\{[^}]*opacity:\s*0/s)
    expect(css).not.toContain('tarot-fan-flight__trail')
    expect(css).not.toContain('tarot-fan-flight__particles')
    expect(css).not.toContain('tarot-fan-flight__glint')
    expect(css).not.toContain('tarot-fan-flight__burst')
    expect(css).not.toContain('@keyframes tarot-flight-')
    expect(css).not.toContain('tarot-picked-illuminate')
    expect(css).not.toContain('tarot-flight-sparkles')
    expect(css).not.toContain('tarot-pick-smooth')
  })

  it('keeps reveal labels upright and crops artwork that has excess margins', () => {
    expect(css).toMatch(/\.tarot-card--flipped\s*\{[^}]*transform:\s*none/s)
    expect(css).toMatch(/\.tarot-card__art--crop\s*\{[^}]*scale:\s*1\.08/s)
  })
})
