import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const commands = [
  ['npx', ['tsc', '-b']],
  ['npm', ['run', 'test:all']],
  ['npm', ['run', 'build:all']],
  ['npm', ['run', 'check:architecture']],
  ['npm', ['run', 'check:docs']],
  ['npm', ['run', 'check:assets']],
]

for (const [command, args] of commands) {
  console.log(`\n=== ${command} ${args.join(' ')} ===`)
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
