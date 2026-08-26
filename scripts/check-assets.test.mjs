import { describe, expect, it } from 'vitest'
import { collectAssetReport } from './check-assets.mjs'

describe('asset checks', () => {
  it('keeps tarot runtime assets within budget and registered in the manifest', async () => {
    const report = await collectAssetReport()
    expect(report.assets.length).toBeGreaterThanOrEqual(24)
    expect(report.assets.some((asset) => asset.path === 'public/tarot/cards/the-fool.jpg')).toBe(true)
    expect(report.assets.some((asset) => asset.path === 'public/tarot/ui/card-back.jpg')).toBe(true)
    expect(report.assets.some((asset) => asset.category === 'runtime-feature')).toBe(true)
    expect(report.assets.every((asset) => !asset.path.startsWith('public/pet/'))).toBe(true)
    expect(report.assets.every((asset) => !asset.path.startsWith('public/icons/'))).toBe(true)
    expect(report.runtimeBytes).toBeLessThan(12 * 1024 * 1024)
    expect(report.errors).toEqual([])
    expect(report.warnings.some((warning) => warning.includes('source-only assets remain'))).toBe(false)
  }, 15_000)
})
