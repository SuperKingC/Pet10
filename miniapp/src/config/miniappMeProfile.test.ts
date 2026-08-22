import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '..')

describe('miniapp me profile editing', () => {
  const meSource = fs.readFileSync(path.join(root, 'features', 'main', 'MiniappMeView.tsx'), 'utf8')

  it('removes the name-and-gender list entry and inline editor', () => {
    expect(meSource).not.toContain('姓名与性别')
    expect(meSource).not.toContain('miniapp-me__editor-title')
    expect(meSource).not.toContain('getGenderLabel')
  })

  it('opens the avatar editor from the avatar and the rename modal from the name', () => {
    expect(meSource).not.toContain('className="miniapp-me__profile" onClick')
    expect(meSource).toContain('className="miniapp-me__avatar" onClick={() => setAvatarEditing(true)}')
    expect(meSource).toContain('setNameEditing(true)')
    expect(meSource).toContain('修改昵称')
  })
})
