import Taro from '@tarojs/taro'

/**
 * 运行时用户照片的统一压缩链路（整条链路只做一次有损压缩）：
 * 1. 选图保持 chooseMedia 的 sizeType: ['compressed']（微信原生温和压缩）。
 * 2. 落库前在这里只压一次：优先降分辨率（compressedWidth 按展示尺寸定），质量保持 80。
 * 3. 超过服务端 dataURL 上限时按递减宽度逐档重试，而不是降质量——
 *    降宽度损失的是展示不出来的像素，降质量损失的是看得见的细节。
 * compressImage 不可用（旧基础库/开发者工具差异）时回退读原图，原图也超限才报错。
 */
export interface ImageCompressOptions {
  /** 递减的压缩宽度(px)，从第一档开始逐档重试直到满足上限 */
  widths: number[]
  /** 服务端 base64 dataURL 字符上限 */
  maxChars: number
  /** 全部档位仍超限时的报错文案 */
  oversizeMessage: string
  /** JPEG 质量，默认 80；不得低于 75，避免肉眼可见的色块 */
  quality?: number
}

function readJpegDataUrl(path: string): string {
  const base64 = Taro.getFileSystemManager().readFileSync(path, 'base64') as string
  return `data:image/jpeg;base64,${base64}`
}

export async function compressImageToDataUrl(src: string, options: ImageCompressOptions): Promise<string> {
  const quality = options.quality ?? 80
  for (const width of options.widths) {
    try {
      // 每一档都从原图压缩，避免对上一次的有损产物二次量化
      const compressed = await Taro.compressImage({ src, quality, compressedWidth: width })
      const dataUrl = readJpegDataUrl(compressed.tempFilePath)
      if (dataUrl.length <= options.maxChars) return dataUrl
    } catch {
      break
    }
  }
  const original = readJpegDataUrl(src)
  if (original.length <= options.maxChars) return original
  throw new Error(options.oversizeMessage)
}
