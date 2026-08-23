import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('chat api bundle boundaries', () => {
  it('does not dynamically import modules that are already shared statically', () => {
    const source = readFileSync(resolve(import.meta.dirname, 'chatApi.ts'), 'utf8')

    expect(source).toContain("from '../domain/petRules'")
    expect(source).toContain("from '../state/mockStore'")
    expect(source).not.toContain("import('../domain/petRules')")
    expect(source).not.toContain("import('../state/mockStore')")
  })
})
