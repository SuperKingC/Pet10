import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { miniappRoot } from './testPaths'

describe('miniapp API build config', () => {
  it('uses the production API when no override is provided', () => {
    const configSource = readFileSync(resolve(miniappRoot(), 'config/index.ts'), 'utf8')

    expect(configSource).toContain(
      "process.env.TARO_API_BASE_URL?.trim() || 'https://api.pet10kk.com'"
    )
  })

  it('requires a tarot asset base URL at build time', () => {
    const configSource = readFileSync(resolve(miniappRoot(), 'config/index.ts'), 'utf8')

    expect(configSource).toContain('process.env.TARO_TAROT_ASSET_BASE_URL')
    expect(configSource).toContain('TARO_TAROT_ASSET_BASE_URL is required')
    expect(configSource).not.toContain("'https://pet10kk.com'")
    expect(configSource).toContain('TARO_TAROT_ASSET_BASE_URL:')
  })
})
