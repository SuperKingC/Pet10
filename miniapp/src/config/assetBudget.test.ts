import { readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { miniappRoot } from './testPaths'

const assetsRoot = resolve(miniappRoot(), 'src/assets')
const maxAssetBytes = 180 * 1024

function collectFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? collectFiles(path) : [path]
  })
}

describe('miniapp asset budget', () => {
  it('keeps packaged images below the WeChat quality limit', () => {
    const oversizedAssets = collectFiles(assetsRoot)
      .filter((path) => /\.(png|jpg|jpeg|webp|mp3|wav)$/i.test(path))
      .filter((path) => statSync(path).size > maxAssetBytes)

    expect(oversizedAssets).toEqual([])
  })
})
