import { describe, expect, it } from 'vitest'
import { normalizeCaption, pickEvictionId, type EvictionCandidate } from './photoWallRules.js'

function candidate(id: string, origin: EvictionCandidate['origin'], createdAtMs: number): EvictionCandidate {
  return { id, origin, createdAt: new Date(createdAtMs) }
}

describe('photo wall rules', () => {
  it('no eviction while under the limit', () => {
    const existing = [candidate('a', 'manual', 1), candidate('b', 'levelup', 2)]
    expect(pickEvictionId(existing, 'manual')).toBeNull()
  })

  it('evicts the oldest manual photo when a manual upload exceeds the limit', () => {
    const existing = [
      candidate('auto-old', 'levelup', 0),
      ...Array.from({ length: 35 }, (_, index) => candidate(`manual-${index}`, 'manual', index + 1))
    ]
    expect(pickEvictionId(existing, 'manual')).toBe('manual-0')
  })

  it('never auto-evicts when an automatic card arrives', () => {
    const existing = Array.from({ length: 36 }, (_, index) => candidate(`m${index}`, 'manual', index))
    expect(pickEvictionId(existing, 'levelup')).toBeNull()
  })

  it('match cards are never auto-evicted', () => {
    const existing = [
      candidate('match', 'match_outfit', 1),
      ...Array.from({ length: 35 }, (_, index) => candidate(`m${index}`, 'manual', index + 2))
    ]
    expect(pickEvictionId(existing, 'manual')).toBe('m0')
  })

  it('normalizes caption length', () => {
    expect(normalizeCaption('  心有灵犀  ')).toBe('心有灵犀')
    expect(normalizeCaption('好'.repeat(50))).toHaveLength(40)
  })
})
