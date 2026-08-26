import { access, readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { extname, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const featureRoot = resolve(root, 'docs/features')
const requiredFeatures = [
  'README.md',
  'miniapp.md',
  'assets-and-performance.md',
  'deployment.md',
]

async function pathExists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

export async function checkDocs() {
  const errors = []
  for (const file of requiredFeatures) {
    if (!await pathExists(resolve(featureRoot, file))) errors.push(`Missing feature document: docs/features/${file}`)
  }
  const files = (await readdir(featureRoot)).filter((file) => extname(file) === '.md')
  for (const file of files) {
    const fullPath = resolve(featureRoot, file)
    const content = await readFile(fullPath, 'utf8')
    for (const match of content.matchAll(/`((?:miniapp\/src|server\/src|docs|deploy|public)\/[^`\s]+)`/g)) {
      const target = resolve(root, match[1])
      if (!await pathExists(target)) errors.push(`${file} references missing path: ${match[1]}`)
    }
  }
  return { files: files.length, errors }
}

export async function main() {
  const result = await checkDocs()
  console.log(`Feature documents: ${result.files}`)
  for (const error of result.errors) console.error(`ERROR: ${error}`)
  if (result.errors.length > 0) process.exitCode = 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
