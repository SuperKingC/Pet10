import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { miniappRoot } from './testPaths'

describe('WeChat app config', () => {
  it('enables required component injection', () => {
    const configSource = readFileSync(resolve(miniappRoot(), 'src/app.config.ts'), 'utf8')

    expect(configSource).toContain("lazyCodeLoading: 'requiredComponents'")
  })
})
