import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const stylesPath = path.resolve(__dirname, 'MiniappTarotFlow.scss')

describe('miniapp tarot WXSS compatibility', () => {
  it('does not emit universal selectors unsupported by the WeChat WXSS compiler', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')

    expect(styles).not.toMatch(/\.miniapp-tarot\s+\*/)
    expect(styles).not.toMatch(/\.miniapp-tarot\s+\*::/)
  })
})
