import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')

describe('miniapp polling lifecycle', () => {
  it('uses the single-flight scheduler for message polling', () => {
    const source = readFileSync(resolve(root, 'features/main/MiniappMessagesView.tsx'), 'utf8')

    expect(source).toContain("from '../../services/singleFlightPolling'")
    expect(source).not.toContain('setInterval(')
    expect(source).toContain('isCurrent()')
  })

  it('uses the single-flight scheduler and freshness guard for Gobang polling', () => {
    const source = readFileSync(resolve(root, 'features/main/MiniappGobangPanel.tsx'), 'utf8')

    expect(source).toContain("from '../../services/singleFlightPolling'")
    expect(source).not.toContain('setInterval(')
    expect(source).toContain('isCurrent()')
  })
})
