import { describe, expect, it } from 'vitest'
import { checkArchitecture } from './check-architecture.mjs'
import { checkDocs } from './check-docs.mjs'

describe('project checks', () => {
  it('keeps architecture violations at zero', async () => {
    const report = await checkArchitecture()
    expect(report.errors).toEqual([])
    expect(report.warnings.some((warning) => warning.includes('ImageGenerationRoom'))).toBe(true)
  })

  it('keeps feature documentation linked to real files', async () => {
    const report = await checkDocs()
    expect(report.errors).toEqual([])
  })
})
