import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { extname, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const sourceExtensions = new Set(['.ts', '.tsx', '.css'])

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...await listFiles(path))
    else if (sourceExtensions.has(extname(path))) files.push(path)
  }
  return files
}

export async function checkArchitecture() {
  const errors = []
  const warnings = []
  const componentFiles = await listFiles(resolve(root, 'src/components'))
  const gameFiles = await listFiles(resolve(root, 'src/games'))
  const uiFiles = [...componentFiles, ...gameFiles]

  for (const file of uiFiles) {
    const content = await readFile(file, 'utf8')
    const repoPath = file.slice(root.length + 1).replaceAll('\\', '/')
    if (content.includes('server/src')) errors.push(`${repoPath} imports server code`)
    if (/\bfetch\s*\(/.test(content)) {
      warnings.push(`${repoPath} calls fetch directly; migrate future API changes through src/services`)
    }
  }

  const styles = await readFile(resolve(root, 'src/styles.css'), 'utf8')
  if (/\.tarot-|@keyframes\s+tarot/.test(styles)) {
    errors.push('src/styles.css contains tarot-specific styles; keep them in src/games/tarot/tarotRitual.css')
  }

  return { errors, warnings }
}

export async function main() {
  const report = await checkArchitecture()
  console.log(`Architecture checks: ${report.errors.length} errors, ${report.warnings.length} warnings`)
  for (const warning of report.warnings) console.warn(`WARNING: ${warning}`)
  for (const error of report.errors) console.error(`ERROR: ${error}`)
  if (report.errors.length > 0) process.exitCode = 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
