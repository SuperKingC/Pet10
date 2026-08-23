export function packageCommandInvocation(command, args, platform = process.platform) {
  if (platform === 'win32') return { command: [command, ...args].join(' '), shell: true }
  return { command, args, shell: false }
}
