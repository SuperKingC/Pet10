import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { miniappRoot } from './testPaths'

describe('miniapp complete tarot flow', () => {
  it('renders every ritual and reading stage', () => {
    const source = readFileSync(
      resolve(miniappRoot(), 'src/features/tarot/MiniappTarotFlow.tsx'),
      'utf8',
    )

    for (const component of [
      'MiniappTarotShuffleStage',
      'MiniappTarotCutStage',
      'MiniappTarotFanStage',
      'MiniappTarotRevealStage',
      'MiniappTarotReadingStage',
      'MiniappTarotHistoryPanel',
    ]) {
      expect(source).toContain(component)
    }
    expect(source).not.toContain('将在下一阶段接入')
  })

  it('passes the active room into tarot sharing', () => {
    const pageSource = readFileSync(
      resolve(miniappRoot(), 'src/pages/index/index.tsx'),
      'utf8',
    )

    expect(pageSource).toContain('<MiniappTarotFlow roomId={roomId}')
  })
})
