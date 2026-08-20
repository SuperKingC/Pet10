import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('miniapp React runtime', () => {
  it('does not depend on the root PWA package', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')
    ) as { dependencies?: Record<string, string> }

    expect(packageJson.dependencies?.['xiaoduoli-pwa']).toBeUndefined()
  })
})
