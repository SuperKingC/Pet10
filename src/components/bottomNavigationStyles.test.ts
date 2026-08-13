import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')

describe('bottom navigation motion', () => {
  it('disables the paw menu animation when reduced motion is requested', () => {
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)')
    expect(styles).toMatch(/prefers-reduced-motion:[\s\S]*\.paw-menu-backdrop[\s\S]*animation:\s*none/)
    expect(styles).toMatch(/prefers-reduced-motion:[\s\S]*\.paw-menu[\s\S]*animation:\s*none/)
  })

  it('raises the paw menu above the bottom navigation and lifts active icons', () => {
    expect(styles).toMatch(/\.paw-menu-backdrop\s*\{[^}]*z-index:\s*50/)
    expect(styles).toContain('.tab-bar__item--active .tab-bar__icon img')
    expect(styles).toMatch(/\.tab-bar__item--active \.tab-bar__icon img\s*\{[^}]*transform:[^}]*scale\(1\.12\)/)
  })

  it('does not replace the selected transform with a press-down transform', () => {
    expect(styles).not.toContain('.tab-bar__item:active .tab-bar__icon img')
  })

  it('renders the supplied blue navigation plate behind the icons', () => {
    expect(styles).toContain("url('/navigation/tab-bar-background.png')")
    expect(styles).toMatch(/\.tab-bar::before\s*\{[^}]*background:[^}]*tab-bar-background\.png/)
  })

  it('aligns the paw circle with the plate bump', () => {
    expect(styles).toMatch(/\.tab-bar__paw-icon\s*\{[^}]*left:\s*calc\(50% - 2px\)/)
    expect(styles).toMatch(/\.tab-bar__paw-icon\s*\{[^}]*bottom:\s*clamp\(11px,\s*3vw,\s*14px\)/)
    expect(styles).toMatch(/\.tab-bar__paw-icon\s*\{[^}]*width:\s*var\(--tab-paw-size\)/)
    expect(styles).toMatch(/\.tab-bar__paw-icon\s*\{[^}]*height:\s*var\(--tab-paw-size\)/)
  })

  it('scales navigation artwork across viewports and lifts the whole icon row', () => {
    expect(styles).toMatch(/\.tab-bar\s*\{[^}]*--tab-icon-size:\s*clamp\(34px,\s*9\.5vw,\s*42px\)/)
    expect(styles).toMatch(/\.tab-bar\s*\{[^}]*--tab-paw-size:\s*clamp\(50px,\s*13\.5vw,\s*58px\)/)
    expect(styles).toMatch(/\.tab-bar\s*\{[^}]*width:\s*min\(100%,\s*430px\)/)
    expect(styles).toMatch(/\.tab-bar\s*\{[^}]*align-self:\s*center/)
    expect(styles).toMatch(/\.tab-bar\s*\{[^}]*padding:[^;}]*calc\(9px \+ env\(safe-area-inset-bottom\)\)/)
    expect(styles).toMatch(/\.tab-bar::before\s*\{[^}]*aspect-ratio:\s*1219\s*\/\s*261/)
    expect(styles).toMatch(/\.tab-bar::before\s*\{[^}]*background:[^;}]*\/\s*contain\s+no-repeat/)
    expect(styles).toMatch(/\.tab-bar__icon\s*\{[^}]*width:\s*var\(--tab-icon-size\)/)
    expect(styles).toMatch(/\.tab-bar__icon img\s*\{[^}]*width:\s*100%/)
  })

  it('keeps installed-app artwork painted while screens switch', () => {
    expect(styles).toMatch(/\.tab-bar--hidden\s*\{[^}]*z-index:\s*0/)
    expect(styles).toMatch(/\.tab-bar--hidden\s*\{[^}]*pointer-events:\s*none/)
    expect(styles).not.toMatch(/\.tab-bar--hidden\s*\{[^}]*visibility:\s*hidden/)
    expect(styles).not.toMatch(/\.tab-bar--hidden\s*\{[^}]*display:\s*none/)
    expect(styles).not.toMatch(/\.tab-panel--active\s*\{[^}]*animation:\s*fade-in/)
    expect(styles).toMatch(/\.chat-view\s*\{[^}]*animation:\s*screen-slide-in/)
    expect(styles).toMatch(/\.chat-row\s*\{[^}]*animation:\s*row-slide-in/)
    expect(styles).toMatch(/@keyframes screen-slide-in\s*\{[^}]*transform:[^}]*translateY/)
    expect(styles).toMatch(/@keyframes row-slide-in\s*\{[^}]*transform:[^}]*translateY/)
  })
})
