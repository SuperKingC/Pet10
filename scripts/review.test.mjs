import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { findAvailablePort, readProcessRecord, removeProcessRecord, writeProcessRecord } from './lib/process.mjs'

describe('review process helpers', () => {
  it('finds an available localhost port', async () => {
    const port = await findAvailablePort(43170, 3)
    expect(port).toBeGreaterThanOrEqual(43170)
    expect(port).toBeLessThanOrEqual(43172)
  })

  it('writes, reads, and removes process records', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'pet10-review-'))
    const path = resolve(directory, 'record.json')
    const record = { pid: 123, port: 4173, cwd: 'D:/Pet10' }
    await writeProcessRecord(path, record)
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual(record)
    expect(await readProcessRecord(path)).toEqual(record)
    await removeProcessRecord(path)
    expect(await readProcessRecord(path)).toBeNull()
  })
})
