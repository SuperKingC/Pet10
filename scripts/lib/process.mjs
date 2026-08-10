import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { dirname } from 'node:path'

export async function isPortAvailable(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const server = createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => server.close(() => resolve(true)))
    server.listen(port, host)
  })
}

export async function findAvailablePort(startPort, attempts = 20) {
  for (let offset = 0; offset < attempts; offset += 1) {
    const port = startPort + offset
    if (await isPortAvailable(port)) return port
  }
  throw new Error(`No available port found from ${startPort} to ${startPort + attempts - 1}`)
}

export async function writeProcessRecord(recordPath, record) {
  await mkdir(dirname(recordPath), { recursive: true })
  await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8')
}

export async function readProcessRecord(recordPath) {
  try {
    return JSON.parse(await readFile(recordPath, 'utf8'))
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return null
    throw error
  }
}

export async function removeProcessRecord(recordPath) {
  await rm(recordPath, { force: true })
}

export function isProcessRunning(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}
