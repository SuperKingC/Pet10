import { describe, expect, it } from 'vitest'
import { createUploadService } from './uploadService.js'

describe('upload service', () => {
  it('rejects unsupported files', async () => {
    const service = createUploadService({ enabled: false })
    await expect(service.createImageUpload('room-1', 'document.pdf', 'application/pdf', 100)).rejects.toThrow('unsupported_image_type')
    await expect(service.createImageUpload('room-1', 'large.png', 'image/png', 6 * 1024 * 1024)).rejects.toThrow('image_too_large')
  })

  it('creates a relationship-scoped signed upload response', async () => {
    const service = createUploadService({
      enabled: true,
      publicBaseUrl: 'https://cdn.example.com',
      signPut: async (objectKey, contentType) => `https://upload.example.com/${objectKey}?type=${contentType}`
    })
    const result = await service.createImageUpload('room-1', '../../My Dog.PNG', 'image/png', 1024)
    expect(result.objectKey).toMatch(/^rooms\/room-1\/[a-f0-9-]+-my-dog\.png$/)
    expect(result.publicUrl).toContain('/rooms/room-1/')
    expect(result.headers).toEqual({ 'content-type': 'image/png' })
  })
})
