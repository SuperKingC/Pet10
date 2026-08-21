import { resolve } from 'node:path'

export function miniappRoot() {
  return process.cwd().endsWith('miniapp') ? process.cwd() : resolve(process.cwd(), 'miniapp')
}
