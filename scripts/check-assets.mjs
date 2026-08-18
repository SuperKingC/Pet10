import { access, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { extname, relative, resolve } from 'node:path'
import { readImageMetadata } from './image-metadata.mjs'

const root = resolve(import.meta.dirname, '..')
const publicRoot = resolve(root, 'public')
const manifestPath = resolve(root, 'docs/assets/asset-manifest.json')
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.svg', '.ico'])
const runtimeDirectories = ['public/icons', 'public/pet', 'public/tarot/cards', 'public/tarot/ui']
const sourceOnlyDirectories = ['public/tarot/concepts']

function toRepoPath(path) {
  return relative(root, path).replaceAll('\\', '/')
}

async function listFiles(directory) {
  const entries = await (await import('node:fs/promises')).readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...await listFiles(path))
    else files.push(path)
  }
  return files
}

function categoryFor(path) {
  const repoPath = toRepoPath(path)
  if (sourceOnlyDirectories.some((directory) => repoPath.startsWith(`${directory}/`))) return 'source-only'
  if (repoPath.startsWith('public/icons/') || repoPath === 'public/pet/xiaoduoli.png') return 'runtime-critical'
  return 'runtime-feature'
}

function budgetFor(repoPath) {
  if (repoPath.startsWith('public/tarot/cards/')) return { warning: 350 * 1024, error: 500 * 1024 }
  if (repoPath.startsWith('public/tarot/ui/')) return { warning: 300 * 1024, error: 500 * 1024 }
  if (repoPath === 'public/pet/xiaoduoli.png') return { warning: 1024 * 1024, error: 1536 * 1024 }
  return { warning: 500 * 1024, error: 1024 * 1024 }
}

export async function collectAssetReport() {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const publicFiles = (await listFiles(publicRoot)).filter((path) => imageExtensions.has(extname(path).toLowerCase()))
  const assets = []
  const errors = []
  const warnings = []
  let sourceOnlyCount = 0
  for (const path of publicFiles) {
    const repoPath = toRepoPath(path)
    const metadata = await readImageMetadata(path)
    const category = categoryFor(path)
    const budget = budgetFor(repoPath)
    const manifestEntry = manifest.assets.find((asset) => asset.path === repoPath)
    if (!manifestEntry) errors.push(`Missing manifest entry: ${repoPath}`)
    if (category === 'source-only') {
      sourceOnlyCount += 1
    } else if (metadata.bytes > budget.error) {
      errors.push(`Asset exceeds error budget: ${repoPath} (${Math.round(metadata.bytes / 1024)} KB)`)
    } else if (metadata.bytes > budget.warning) {
      warnings.push(`Asset exceeds warning budget: ${repoPath} (${Math.round(metadata.bytes / 1024)} KB)`)
    }
    assets.push({ path: repoPath, category, ...metadata })
  }
  const runtimeBytes = assets.filter((asset) => asset.category !== 'source-only').reduce((sum, asset) => sum + asset.bytes, 0)
  if (sourceOnlyCount > 0) warnings.push(`${sourceOnlyCount} source-only assets remain under public and should move outside the production image path`)
  if (runtimeBytes > 12 * 1024 * 1024) errors.push(`Runtime image budget exceeded: ${Math.round(runtimeBytes / 1024 / 1024)} MB`)
  else if (runtimeBytes > 8 * 1024 * 1024) warnings.push(`Runtime image budget warning: ${Math.round(runtimeBytes / 1024 / 1024)} MB`)
  return { assets, errors, warnings, runtimeBytes }
}

export async function main() {
  await access(manifestPath)
  const report = await collectAssetReport()
  console.log(`Assets: ${report.assets.length}; runtime: ${(report.runtimeBytes / 1024 / 1024).toFixed(2)} MB`)
  for (const warning of report.warnings) console.warn(`WARNING: ${warning}`)
  for (const error of report.errors) console.error(`ERROR: ${error}`)
  if (report.errors.length > 0) process.exitCode = 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
