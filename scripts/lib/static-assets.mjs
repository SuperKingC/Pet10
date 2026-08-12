import { readdir, stat } from 'node:fs/promises'
import { extname, join, relative, sep } from 'node:path'

const RUNTIME_ROOTS = [
  'assets',
  'pet',
  'icons',
  'navigation',
  'me',
  'tarot/cards',
  'tarot/ui'
]

const CONTENT_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp']
])

function toPosixPath(path) {
  return path.split(sep).join('/')
}

async function collectFiles(root) {
  try {
    const rootStat = await stat(root)
    if (!rootStat.isDirectory()) return []
  } catch {
    return []
  }

  const entries = await readdir(root, { recursive: true, withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
}

export async function collectStaticAssets(distRoot, version) {
  if (!version || version.includes('/') || version.includes('\\')) {
    throw new Error('Static asset version must be a single path segment')
  }

  const files = (await Promise.all(
    RUNTIME_ROOTS.map((root) => collectFiles(join(distRoot, root)))
  )).flat()

  const assets = await Promise.all(files.map(async (filePath) => {
      const assetPath = toPosixPath(relative(distRoot, filePath))
      const fileStat = await stat(filePath)
      return {
        filePath,
        key: `${version}/${assetPath}`,
        contentType: CONTENT_TYPES.get(extname(filePath).toLowerCase()) || 'application/octet-stream',
        cacheControl: 'public, max-age=31536000, immutable',
        size: fileStat.size
      }
    }))

  return assets.sort((left, right) => left.key.localeCompare(right.key))
}
