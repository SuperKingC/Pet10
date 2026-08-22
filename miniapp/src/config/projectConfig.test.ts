import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { miniappRoot } from './testPaths'

describe('WeChat developer tools project config', () => {
  it('imports the Taro project root and serves the dist directory', () => {
    const config = JSON.parse(
      readFileSync(resolve(miniappRoot(), 'project.config.json'), 'utf8'),
    ) as {
      compileType?: string
      miniprogramRoot?: string
      setting?: {
        minified?: boolean
      }
    }

    expect(config.compileType).toBe('miniprogram')
    expect(['./dist', 'dist/']).toContain(config.miniprogramRoot)
    expect(config.setting?.minified).toBe(true)
  })

  it('also supports importing the repository root', () => {
    const config = JSON.parse(
      readFileSync(resolve(miniappRoot(), '../project.config.json'), 'utf8'),
    ) as {
      compileType?: string
      miniprogramRoot?: string
    }

    expect(config.compileType).toBe('miniprogram')
    expect(config.miniprogramRoot).toBe('./miniapp/dist')
  })
})
