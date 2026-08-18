import { mkdir, writeFile } from 'node:fs/promises'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { collectStaticAssets, normalizeAssetPrefix } from './lib/static-assets.mjs'
import { uploadStaticAssets } from './lib/cos-upload.mjs'

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), 'pet10-static-assets-'))
  const files = [
    'assets/index-abc.js',
    'pet/xiaoduoli.png',
    'nest/action-feed.png',
    'icons/icon-192.png',
    'navigation/nest.png',
    'me/about.png',
    'tarot/cards/the-world.jpg',
    'tarot/ui/card-back.jpg',
    'tarot/concepts/the-world.png',
    'index.html',
    'sw.js',
    'manifest.webmanifest'
  ]

  await Promise.all(files.map(async (file) => {
    const path = join(root, file)
    await mkdir(join(path, '..'), { recursive: true })
    await writeFile(path, 'fixture')
  }))

  return root
}

describe('static asset manifest', () => {
  it('includes runtime assets under the commit version', async () => {
    const distRoot = await createFixture()

    const entries = await collectStaticAssets(distRoot, 'commit-sha')

    expect(entries.map((entry) => entry.key)).toEqual(expect.arrayContaining([
      'commit-sha/assets/index-abc.js',
      'commit-sha/pet/xiaoduoli.png',
      'commit-sha/nest/action-feed.png',
      'commit-sha/tarot/cards/the-world.jpg'
    ]))
  })

  it('adds the public URL pathname before the commit version when configured', async () => {
    const distRoot = await createFixture()

    const entries = await collectStaticAssets(distRoot, 'commit-sha', 'pet10-web')

    expect(entries.map((entry) => entry.key)).toEqual(expect.arrayContaining([
      'pet10-web/commit-sha/pet/xiaoduoli.png',
      'pet10-web/commit-sha/nest/action-feed.png'
    ]))
  })

  it('normalizes a public static URL pathname into a COS key prefix', () => {
    expect(normalizeAssetPrefix('https://bucket.cos-region.myqcloud.com/pet10-web')).toBe('pet10-web')
    expect(normalizeAssetPrefix('https://bucket.cos-region.myqcloud.com/')).toBe('')
  })

  it('excludes source-only artwork and same-origin application control files', async () => {
    const distRoot = await createFixture()

    const entries = await collectStaticAssets(distRoot, 'commit-sha')
    const keys = entries.map((entry) => entry.key)

    expect(keys).not.toEqual(expect.arrayContaining([
      'commit-sha/tarot/concepts/the-world.png',
      'commit-sha/index.html',
      'commit-sha/sw.js',
      'commit-sha/manifest.webmanifest'
    ]))
  })
})

describe('static asset upload', () => {
  it('uploads every manifest entry with immutable cache metadata', async () => {
    const distRoot = await createFixture()
    const requests = []
    const client = {
      putObject(request, callback) {
        requests.push(request)
        callback(null, { statusCode: 200 })
      }
    }

    const uploaded = await uploadStaticAssets({
      client,
      bucket: 'pet10-123',
      region: 'ap-guangzhou',
      version: 'commit-sha',
      distRoot,
      prefix: 'pet10-web'
    })

    expect(uploaded).toBeGreaterThan(0)
    expect(requests).toEqual(expect.arrayContaining([
      expect.objectContaining({
        Bucket: 'pet10-123',
        Region: 'ap-guangzhou',
        Key: 'pet10-web/commit-sha/pet/xiaoduoli.png',
        CacheControl: 'public, max-age=31536000, immutable',
        ContentType: 'image/png'
      })
    ]))
  })
})
