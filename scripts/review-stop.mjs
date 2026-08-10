import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { isProcessRunning, readProcessRecord, removeProcessRecord } from './lib/process.mjs'

const root = resolve(import.meta.dirname, '..')
const recordPath = resolve(root, '.codex/review-process.json')
const record = await readProcessRecord(recordPath)

if (!record) {
  console.log('没有正在运行的本地验收服务。')
  process.exit(0)
}

if (isProcessRunning(record.pid)) {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(record.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true })
  } else {
    try {
      process.kill(-record.pid, 'SIGTERM')
    } catch {
      process.kill(record.pid, 'SIGTERM')
    }
  }
}

await removeProcessRecord(recordPath)
console.log(`已停止本地验收服务: ${record.url}`)
