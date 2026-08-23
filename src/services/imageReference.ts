export const MAX_REFERENCE_BYTES = 2 * 1024 * 1024

export interface ReferenceImage {
  name: string
  dataUrl: string
  bytes: number
}

export function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? ''
  return Math.floor(base64.length * 3 / 4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0)
}

export async function prepareReferenceImage(file: File): Promise<ReferenceImage> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('只支持 JPEG、PNG 或 WebP 图片')
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('浏览器无法处理这张图片')
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  let quality = 0.9
  let dataUrl = canvas.toDataURL('image/jpeg', quality)
  while (dataUrlBytes(dataUrl) > MAX_REFERENCE_BYTES && quality > 0.4) {
    quality -= 0.1
    dataUrl = canvas.toDataURL('image/jpeg', quality)
  }
  const bytes = dataUrlBytes(dataUrl)
  if (bytes > MAX_REFERENCE_BYTES) throw new Error('图片压缩后仍超过 2 MB，请换一张较小的图片')
  return { name: file.name, dataUrl, bytes }
}
