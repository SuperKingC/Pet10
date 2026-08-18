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

export function normalizeAssetPrefix(baseUrl) {
  const value = baseUrl?.trim()
  if (!value) return ''

  let pathname
  try {
    pathname = new URL(value).pathname
  } catch {
    throw new Error('Static asset base URL must be a valid absolute URL')
  }

  return pathname.split('/').filter(Boolean).join('/')
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

export async function collectStaticAssets(distRoot, version, prefix = '') {
  if (!version || version.includes('/') || version.includes('\\')) {
    throw new Error('Static asset version must be a single path segment')
  }

  if (prefix.includes('\\') || prefix.split('/').some((segment) => segment === '..')) {
    throw new Error('Static asset prefix must contain valid path segments')
  }

  const normalizedPrefix = prefix.split('/').filter(Boolean).join('/')
  const files = (await Promise.all(
    RUNTIME_ROOTS.map((root) => collectFiles(join(distRoot, root)))
  )).flat()

  const assets = await Promise.all(files.map(async (filePath) => {
      const assetPath = toPosixPath(relative(distRoot, filePath))
      const fileStat = await stat(filePath)
      return {
        filePath,
        key: `${normalizedPrefix ? `${normalizedPrefix}/` : ''}${version}/${assetPath}`,
        contentType: CONTENT_TYPES.get(extname(filePath).toLowerCase()) || 'application/octet-stream',
        cacheControl: 'public, max-age=31536000, immutable',
        size: fileStat.size
      }
    }))

  return assets.sort((left, right) => left.key.localeCompare(right.key))
}
