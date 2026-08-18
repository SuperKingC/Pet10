import { createReadStream } from 'node:fs'
import { collectStaticAssets } from './static-assets.mjs'

function putObject(client, request) {
  return new Promise((resolve, reject) => {
    client.putObject(request, (error, result) => {
      if (error) {
        reject(error)
        return
      }
      resolve(result)
    })
  })
}

export async function uploadStaticAssets({
  client,
  bucket,
  region,
  version,
  distRoot,
  prefix = '',
  concurrency = 4
}) {
  if (!client) throw new Error('COS client is required')
  if (!bucket) throw new Error('COS bucket is required')
  if (!region) throw new Error('COS region is required')

  const entries = await collectStaticAssets(distRoot, version, prefix)
  let nextIndex = 0
  const workerCount = Math.max(1, Math.min(concurrency, entries.length || 1))

  async function worker() {
    while (nextIndex < entries.length) {
      const entry = entries[nextIndex]
      nextIndex += 1
      await putObject(client, {
        Bucket: bucket,
        Region: region,
        Key: entry.key,
        Body: createReadStream(entry.filePath),
        ContentLength: entry.size,
        ContentType: entry.contentType,
        CacheControl: entry.cacheControl
      })
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  return entries.length
}
