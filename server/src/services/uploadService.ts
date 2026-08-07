import { randomUUID } from 'node:crypto'
import OSS from 'ali-oss'

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const maxImageBytes = 5 * 1024 * 1024

interface UploadDependencies {
  enabled: boolean
  publicBaseUrl?: string
  signPut?: (objectKey: string, contentType: string) => Promise<string>
}

export function createAliOssSigner(config: {
  enabled: boolean
  region?: string
  bucket?: string
  accessKeyId?: string
  accessKeySecret?: string
}) {
  if (!config.enabled || !config.region || !config.bucket || !config.accessKeyId || !config.accessKeySecret) {
    return undefined
  }
  const client = new OSS({
    region: config.region,
    bucket: config.bucket,
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    secure: true
  })
  return async (objectKey: string, contentType: string) => {
    return client.signatureUrlV4('PUT', 300, {
      headers: { 'content-type': contentType }
    }, objectKey, ['content-type'])
  }
}

function sanitizeFileName(fileName: string) {
  const cleaned = fileName.toLowerCase().replace(/\\/g, '/').split('/').at(-1) ?? 'image'
  return cleaned.replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-80) || 'image'
}

export function createUploadService(dependencies: UploadDependencies) {
  return {
    async createImageUpload(roomId: string, fileName: string, contentType: string, size: number) {
      if (!allowedTypes.has(contentType)) throw new Error('unsupported_image_type')
      if (size <= 0 || size > maxImageBytes) throw new Error('image_too_large')
      if (!dependencies.enabled || !dependencies.signPut || !dependencies.publicBaseUrl) {
        throw new Error('oss_not_configured')
      }
      const objectKey = `rooms/${roomId}/${randomUUID()}-${sanitizeFileName(fileName)}`
      return {
        uploadUrl: await dependencies.signPut(objectKey, contentType),
        publicUrl: `${dependencies.publicBaseUrl}/${objectKey}`,
        objectKey,
        expiresInSeconds: 300,
        headers: { 'content-type': contentType }
      }
    }
  }
}
