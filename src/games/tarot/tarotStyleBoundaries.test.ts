import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const globalCss = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')
const tarotCss = readFileSync(resolve(process.cwd(), 'src/games/tarot/tarotRitual.css'), 'utf8')

function selectorCount(selector: string): number {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return [...tarotCss.matchAll(new RegExp(`(?:^|\\n)${escaped}\\s*\\{`, 'g'))].length
}

describe('tarot style boundaries', () => {
  it('keeps tarot rules in the feature stylesheet instead of the global stylesheet', () => {
    expect(globalCss).toContain("@import './games/tarot/tarotRitual.css';")
    expect(globalCss).not.toMatch(/(?:^|\n)\.tarot-game\s*\{/)
    expect(tarotCss).toMatch(/(?:^|\n)\.tarot-game\s*\{/)
  })

  it('defines each critical animation selector exactly once', () => {
    expect(selectorCount('.tarot-shuffle-deck')).toBe(1)
    expect(selectorCount('.tarot-cut-deck--cutting .tarot-cut-deck__left')).toBeLessThanOrEqual(1)
    expect(selectorCount('.tarot-fan')).toBe(1)
    expect(selectorCount('.tarot-fan__card')).toBe(1)
    expect(selectorCount('.tarot-reveal-row')).toBe(1)
  })

  it('defines each tarot keyframe name exactly once', () => {
    const names = [...tarotCss.matchAll(/@keyframes\s+(tarot-[\w-]+)/g)].map((match) => match[1])
    expect(new Set(names).size).toBe(names.length)
  })
})
