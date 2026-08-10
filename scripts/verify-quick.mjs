import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const scopeArgument = process.argv.find((argument) => argument.startsWith('--scope='))
const scope = scopeArgument?.split('=')[1]

const commands = {
  tarot: [
    ['npx', ['vitest', '--run', 'src/games/tarot', 'src/dev/tarot']],
    ['npx', ['tsc', '-b']],
  ],
  ui: [
    ['npx', ['vitest', '--run', 'src/components']],
    ['npx', ['tsc', '-b']],
  ],
  server: [
    ['npm', ['run', 'server:test']],
    ['npm', ['run', 'server:build']],
  ],
}

if (!scope || !(scope in commands)) {
  console.error('Usage: npm run verify:quick -- --scope=tarot|ui|server')
  process.exit(1)
}

for (const [command, args] of commands[scope]) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
