import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { miniappRoot } from './testPaths'

describe('miniapp home authentication gate', () => {
  it('returns the login screen before rendering authenticated content', () => {
    const pageSource = readFileSync(resolve(miniappRoot(), 'src/pages/index/index.tsx'), 'utf8')
    const authGateIndex = pageSource.indexOf('if (!hasAuthenticatedSession(accessToken)) {')
    const authenticatedContentIndex = pageSource.indexOf('const renderMainContent = () => {')

    expect(authGateIndex).toBeGreaterThan(-1)
    expect(authGateIndex).toBeLessThan(authenticatedContentIndex)
  })
})
