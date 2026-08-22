import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const stagePath = path.resolve(__dirname, 'MiniappTarotShuffleStage.tsx')

describe('miniapp tarot shuffle stage contract', () => {
  it('keeps the long-press duration at a brisk 3000ms', () => {
    const stage = fs.readFileSync(stagePath, 'utf8')

    expect(stage).toContain('const shuffleDurationMs = 3000')
    expect(stage).not.toContain('const shuffleDurationMs = 4000')
  })

  it('keeps shuffling allowed after progress reaches 100', () => {
    const stage = fs.readFileSync(stagePath, 'utf8')

    // start() must not early-return when progress is already full
    expect(stage).not.toContain('progress >= 100 || timerRef.current')
    expect(stage).toContain('if (timerRef.current) return')
    // the interval must not auto-stop at 100; release is the only stop trigger
    expect(stage).not.toContain('if (next >= 100) stop()')
  })
})
