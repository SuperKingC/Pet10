import { describe, expect, it } from 'vitest'
import { collectAssetReport } from './check-assets.mjs'

describe('asset checks', () => {
  it('reports runtime assets and source-only assets separately', async () => {
    const report = await collectAssetReport()
    expect(report.assets.length).toBeGreaterThan(30)
    expect(report.assets.some((asset) => asset.category === 'source-only')).toBe(true)
    expect(report.assets.some((asset) => asset.category === 'runtime-feature')).toBe(true)
    expect(report.runtimeBytes).toBeLessThan(12 * 1024 * 1024)
    expect(report.errors).toEqual([])
    expect(report.warnings.some((warning) => warning.includes('source-only assets remain'))).toBe(true)
  }, 15_000)
})
