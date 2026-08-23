import { describe, expect, it } from 'vitest'
import { packageCommandInvocation } from './package-command.mjs'

describe('package command invocation', () => {
  it('uses a single shell command string on Windows', () => {
    expect(packageCommandInvocation('npm', ['run', 'test:all'], 'win32')).toEqual({
      command: 'npm run test:all',
      shell: true,
    })
  })

  it('keeps executable arguments separate outside Windows', () => {
    expect(packageCommandInvocation('npm', ['run', 'test:all'], 'linux')).toEqual({
      command: 'npm',
      args: ['run', 'test:all'],
      shell: false,
    })
  })
})
