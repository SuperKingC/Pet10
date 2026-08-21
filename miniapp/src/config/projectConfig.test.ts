import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('WeChat developer tools project config', () => {
  it('imports the Taro project root and serves the dist directory', () => {
    const config = JSON.parse(
      readFileSync(resolve(process.cwd(), 'project.config.json'), 'utf8'),
    ) as {
      compileType?: string
      miniprogramRoot?: string
      setting?: {
        minified?: boolean
      }
    }

    expect(config.compileType).toBe('miniprogram')
    expect(config.miniprogramRoot).toBe('./dist')
    expect(config.setting?.minified).toBe(true)
  })
})
