import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { packageCommandInvocation } from './package-command.mjs'

const root = resolve(import.meta.dirname, '..')
const commands = [
  ['npm', ['run', 'test:all']],
  ['npm', ['run', 'build:all']],
  ['npm', ['run', 'check:docs']],
  ['npm', ['run', 'check:assets']],
]

for (const [command, args] of commands) {
  console.log(`\n=== ${command} ${args.join(' ')} ===`)
  const invocation = packageCommandInvocation(command, args)
  const options = { cwd: root, stdio: 'inherit' }
  const result = invocation.shell
    ? spawnSync(invocation.command, { ...options, shell: true })
    : spawnSync(invocation.command, invocation.args, options)
  if (result.status !== 0) process.exit(result.status ?? 1)
}
