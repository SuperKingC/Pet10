export type ImageResourceProgress = (loaded: number, total?: number) => void

export async function loadImageResource(url: string, onProgress?: ImageResourceProgress): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`图片资源下载失败：${url}`)

  const total = Number(response.headers.get('content-length')) || undefined
  if (!response.body) {
    const blob = await response.blob()
    onProgress?.(total ?? blob.size, total ?? blob.size)
    await decodeImage(url, blob)
    return
  }

  const reader = response.body.getReader()
  const chunks: ArrayBuffer[] = []
  let loaded = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      chunks.push(value.slice().buffer as ArrayBuffer)
      loaded += value.byteLength
      onProgress?.(loaded, total)
    }
  }

  onProgress?.(total ?? loaded, total ?? loaded)
  await decodeImage(url, new Blob(chunks))
}

function decodeImage(url: string, blob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(blob)
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve()
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error(`图片资源下载失败：${url}`))
    }
    image.src = objectUrl
  })
}
