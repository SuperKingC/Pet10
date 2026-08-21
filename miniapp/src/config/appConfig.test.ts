import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('WeChat app config', () => {
  it('enables required component injection', () => {
    const configSource = readFileSync(resolve(process.cwd(), 'src/app.config.ts'), 'utf8')

    expect(configSource).toContain("lazyCodeLoading: 'requiredComponents'")
  })
})
