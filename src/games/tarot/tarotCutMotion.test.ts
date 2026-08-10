import { describe, expect, it } from 'vitest'
import { getTarotCutFrame, TAROT_CUT_DURATION_MS } from './tarotCutMotion'

describe('tarot standard table cut motion', () => {
  it('starts from the two resting pile positions and finishes with a clear depth swap', () => {
    const start = getTarotCutFrame(0, false)
    const end = getTarotCutFrame(1, false)

    expect(TAROT_CUT_DURATION_MS).toBe(1350)
    expect(start.upper).toMatchObject({ x: 0, y: 0, z: 0 })
    expect(start.lower).toMatchObject({ x: 0, y: 22, z: -20 })
    expect(end.upper.y).toBeCloseTo(-5)
    expect(end.upper.z).toBeLessThan(-120)
    expect(end.lower.y).toBeCloseTo(-13)
    expect(end.lower.z).toBeGreaterThan(15)
  })

  it('moves the upper pile farther on desktop while keeping the arc continuous', () => {
    const desktop = getTarotCutFrame(.5, false)
    const compact = getTarotCutFrame(.5, true)

    expect(desktop.upper.x).toBeGreaterThan(80)
    expect(compact.upper.x).toBeLessThan(desktop.upper.x)

    for (const boundary of [.43, .53, .61, .69, .76, .86]) {
      const before = getTarotCutFrame(boundary - .0001, false)
      const after = getTarotCutFrame(boundary + .0001, false)
      const upperDelta = Math.hypot(
        after.upper.x - before.upper.x,
        after.upper.y - before.upper.y,
        after.upper.z - before.upper.z
      )
      const lowerDelta = Math.hypot(
        after.lower.x - before.lower.x,
        after.lower.y - before.lower.y,
        after.lower.z - before.lower.z
      )

      expect(upperDelta).toBeLessThan(.5)
      expect(lowerDelta).toBeLessThan(.5)
    }
  })

  it('starts repeated cuts from the previous settled pile positions', () => {
    const repeatedStart = getTarotCutFrame(0, false, true)
    const repeatedEnd = getTarotCutFrame(1, false, true)

    expect(repeatedStart.upper).toMatchObject({ y: -13, z: 20 })
    expect(repeatedStart.lower).toMatchObject({ y: -5, z: -126 })
    expect(repeatedEnd.upper.y).toBeCloseTo(-5)
    expect(repeatedEnd.upper.z).toBeCloseTo(-126)
    expect(repeatedEnd.lower.y).toBeCloseTo(-13)
    expect(repeatedEnd.lower.z).toBeCloseTo(20)
  })
})
