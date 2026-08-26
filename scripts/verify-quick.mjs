import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { packageCommandInvocation } from './package-command.mjs'

const root = resolve(import.meta.dirname, '..')
const scopeArgument = process.argv.find((argument) => argument.startsWith('--scope='))
const scope = scopeArgument?.split('=')[1]

const commands = {
  miniapp: [
    ['npm', ['test', '--prefix', 'miniapp']],
  ],
  server: [
    ['npm', ['run', 'server:test']],
    ['npm', ['run', 'server:build']],
  ],
}

if (!scope || !(scope in commands)) {
  console.error('Usage: npm run verify:quick -- --scope=miniapp|server')
  process.exit(1)
}

for (const [command, args] of commands[scope]) {
  const invocation = packageCommandInvocation(command, args)
  const options = { cwd: root, stdio: 'inherit' }
  const result = invocation.shell
    ? spawnSync(invocation.command, { ...options, shell: true })
    : spawnSync(invocation.command, invocation.args, options)
  if (result.status !== 0) process.exit(result.status ?? 1)
}
