export type ImageResourceProgress = (loaded: number, total?: number) => void

export async function loadImageResource(url: string, onProgress?: ImageResourceProgress): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`图片资源下载失败：${url}`)

  const total = Number(response.headers.get('content-length')) || undefined
  if (!response.body) {
    const blob = await response.blob()
    onProgress?.(total ?? blob.size, total ?? blob.size)
    return
  }

  const reader = response.body.getReader()
  let loaded = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      loaded += value.byteLength
      onProgress?.(loaded, total)
    }
  }

  onProgress?.(total ?? loaded, total ?? loaded)
}

export async function decodeImageResource(url: string): Promise<void> {
  const image = new Image()
  image.decoding = 'async'
  image.src = url
  await image.decode()
}
