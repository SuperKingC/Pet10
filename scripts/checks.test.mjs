import { describe, expect, it } from 'vitest'
import { checkDocs } from './check-docs.mjs'

describe('project checks', () => {
  it('keeps feature documentation linked to real files', async () => {
    const report = await checkDocs()
    expect(report.errors).toEqual([])
  })
})
