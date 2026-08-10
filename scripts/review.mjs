import { mkdir, open } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { findAvailablePort, isProcessRunning, readProcessRecord, writeProcessRecord } from './lib/process.mjs'

const root = resolve(import.meta.dirname, '..')
const recordPath = resolve(root, '.codex/review-process.json')
const logPath = resolve(root, '.codex/review.log')

async function waitForUrl(url, attempts = 80) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // The Vite server is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100))
  }
  throw new Error(`Review server did not become ready: ${url}`)
}

const existing = await readProcessRecord(recordPath)
if (existing && isProcessRunning(existing.pid)) {
  console.log(`本地验收地址: ${existing.url}`)
  console.log(`模式: ${existing.mode}`)
  console.log('停止命令: npm run review:stop')
  process.exit(0)
}

const port = await findAvailablePort(4173)
const url = `http://127.0.0.1:${port}`
await mkdir(resolve(root, '.codex'), { recursive: true })
const log = await open(logPath, 'a')
const vitePath = resolve(root, 'node_modules/vite/bin/vite.js')
const child = spawn(process.execPath, [vitePath, '--host', '127.0.0.1', '--port', String(port)], {
  cwd: root,
  detached: true,
  stdio: ['ignore', log.fd, log.fd],
  windowsHide: true,
})
child.unref()

await writeProcessRecord(recordPath, {
  pid: child.pid,
  port,
  url,
  mode: process.env.VITE_USE_MOCK_API === 'false' ? 'real-api' : 'mock',
  cwd: root,
  startedAt: new Date().toISOString(),
})

try {
  await waitForUrl(url)
} catch (error) {
  try {
    process.kill(child.pid)
  } catch {
    // The child already stopped.
  }
  throw error
} finally {
  await log.close()
}

console.log(`本地验收地址: ${url}`)
console.log(`模式: ${process.env.VITE_USE_MOCK_API === 'false' ? 'real-api' : 'mock'}`)
console.log('塔罗直达: /dev/tarot?stage=cut')
console.log('停止命令: npm run review:stop')
